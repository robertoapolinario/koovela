# Research: Agendamento e ciclo de vida (009)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 003 (consumidor global, etapas 1 e 2), 005 (página, origem da visita), 006 (versões), 007 (versões do profissional e da comissão), 008 (ocupações). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e relação com o motor (008)

- **Decisão**: domínio `scheduling`, mesmo domínio da 008. O agendamento chama o **módulo** de ocupação da 008 dentro do mesmo processo e da **mesma transação** (é o mesmo dono de tabelas). As outras origens (013, 014, 026…) usam o contrato HTTP interno da 008.
- **Por quê**: remarcar exige ocupar a nova janela e liberar a antiga de forma atômica (REQ-AGE-030); dentro do mesmo domínio isso é uma transação só.

## R2. Máquina de estados

- **Decisão**: tabela de transições permitidas no código (`packages/domain/appointment-state`) e `CHECK` dos valores no banco; cada transição grava `scheduling_appointment_transition` (append-only) e o evento no outbox na mesma transação (REQ-AGE-002). Teste de propriedade com fast-check gera sequências de comandos e verifica que nenhuma transição proibida ocorre, como portão de merge (REQ-AGE-004).

| De | Para | Quem |
|---|---|---|
| `RASCUNHO` | `PENDENTE_PAGAMENTO` | sistema (exige pagamento online) |
| `RASCUNHO` | `CONFIRMADO` | sistema (não exige) |
| `RASCUNHO` / `PENDENTE_PAGAMENTO` | `EXPIRADO` | sistema (hold venceu) |
| `PENDENTE_PAGAMENTO` | `CONFIRMADO` | `payments` (aprovado) |
| `CONFIRMADO` | `EM_ATENDIMENTO` | check-in |
| `EM_ATENDIMENTO` | `CONCLUIDO` | check-out |
| `CONFIRMADO` | `CANCELADO_USUARIO` / `CANCELADO_ESTABELECIMENTO` | consumidor / equipe |
| `CONFIRMADO` | `REAGENDADO` | remarcação (cria novo `CONFIRMADO`) |
| `CONFIRMADO` | `NO_SHOW` | equipe após tolerância |
| `NO_SHOW` | `CONFIRMADO` \| `CONCLUIDO` | correção em até 48 h, com registro |

## R3. Versões congeladas

- **Decisão**: na criação, o agendamento grava os ids das versões vigentes (REQ-AGE-015): serviço e preço da filial (006), *override* do profissional e regra de comissão (007), política (010) e regra de fidelidade (015) quando existirem; mais um `price_snapshot` em centavos. Remarcação copia as mesmas versões e o mesmo pagamento (REQ-AGE-030). Nada recalcula depois.

## R4. Criação e confirmação (J1)

- **Decisão**:
  1. escolher horário → agendamento `RASCUNHO` + *hold* da 008 (10 min);
  2. se faltar etapa 1 ou 2 (003), o fluxo pede e volta ao resumo (REQ-AGE-012), estendendo o *hold* uma vez se preciso;
  3. resumo mostra a política congelada (010);
  4. `confirm`: se a 010/012 exigir pagamento (sinal opcional por serviço ou taxa de agendamento de saúde, decididos no clarify), vai a `PENDENTE_PAGAMENTO` e confirma no evento de pagamento aprovado; senão, `CONFIRMADO` direto (REQ-AGE-013).
- Limite de 5 agendamentos futuros por consumidor e estabelecimento (app e web): contador por `(business, consumer)` travado na transação; equipe pode exceder com confirmação (REQ-AGE-017).
- Meta: ≤ 2 s p95 do toque à tela de confirmação, sem o pagamento (REQ-AGE-072).
- Tela de confirmação com resumo, endereço completo (mesmo quando a página mostra só o bairro, REQ-NEG-051), mapa, arquivo `.ics` e próximo passo (REQ-AGE-014).

## R5. "Meus agendamentos" entre tenants (C5)

- **Decisão**: projeção `koovela_projections.consumer_appointments_index` (dono `scheduling`) alimentada pelos eventos de agendamento de todos os tenants, com campos de exibição não sensíveis (nome do negócio, serviço, nome de exibição do profissional, data, fuso, estado, ações permitidas). O consumidor lê por `consumer_id` da credencial; ações (remarcar, cancelar) vão ao tenant cujo `tenant_id` vem da **linha da projeção do próprio consumidor** (nunca do cliente). Tenants não leem a projeção (REQ-AGE-021).

## R6. Agenda da equipe em tempo real

- **Decisão**: P03/P04 consultam `/v1/tenant/agenda` e assinam `GET /v1/tenant/agenda/stream` (**Server-Sent Events** pelo gateway; atravessa a Cloudflare sem custo), que repassa os eventos de agendamento e ocupação da filial em ≤ 5 s (REQ-AGE-043). Reconexão com `Last-Event-ID`.
- **Alternativas**: WebSocket (mais infraestrutura), *polling* de 5 s (carga sem necessidade).

## R7. Agendamento manual e pré-cadastro

- **Decisão**: P05 busca o consumidor por celular (HMAC via contrato do `identity`) ou por nome entre os que já agendaram no tenant (`scheduling_client_link`, só ids + nome de exibição em cache local). Consumidor novo: contrato **novo no `identity`** `POST /v1/internal/identity/consumers/pre-register` (nome + celular, sem OTP, visível só ao tenant que criou até a verificação, REQ-AGE-042), registrado aqui como dependência do contrato da 003. O consumidor recebe aviso (011).

## R8. Atendimento e app do colaborador offline

- **Decisão**: check-in a partir de 30 min antes (REQ-AGE-050). App do colaborador guarda os próximos 7 dias em SQLite local (`expo-sqlite`) com a hora da última sincronização; check-in e check-out sem rede entram numa fila local com `Idempotency-Key` e horário do aparelho, enviados ao reconectar com `recorded_offline = true`; o estado do servidor prevalece em conflito (REQ-AGE-052). "A partir de": valor final no check-out ≥ mínimo, com aviso ao consumidor antes de cobrar a diferença (REQ-AGE-051).

## R9. Não comparecimento e pendências

- **Decisão**: `NO_SHOW` só após a tolerância da política (padrão 15 min, REQ-AGE-060). Tarefa no fim do dia local de cada filial lista `CONFIRMADO` sem check-in em `scheduling_pending_record` sem mudar o estado (REQ-AGE-061). Correção de `NO_SHOW` em até 48 h com registro; consequências revertidas pela 010 (REQ-AGE-062).

## R10. Afetados por mudanças (007 e 005)

- **Decisão**: consumidores de `workforce.availability.changed.v1` e `tenancy.branch.hours_changed.v1` marcam agendamentos afetados em `scheduling_affected_appointment`; a tela de afetados permite remarcar, trocar profissional ou cancelar, um a um ou em lote, com aviso (REQ-AGE-033). Troca de profissional pelo estabelecimento → consumidor que tinha escolhido o profissional pode cancelar sem custo (REQ-AGE-034). Contrato de consulta "agendamentos no período por profissional" atende a 005 e a 007.

## R11. Observação cifrada

- **Decisão**: observação até 300 caracteres, cifrada por campo (003), visível só à equipe da filial; em saúde, classificada como sensível e excluída de exportações não autorizadas (REQ-AGE-018).

## R12. Telas (Figma)

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Meus agendamentos · Data e horário · Resumo e política · Confirmação · Remarcar e cancelar | C03 · C07 · C08 · C12 · C13 |
| Web do consumidor | Meus agendamentos · Data e horário · Resumo e política · Confirmação · Remarcar e cancelar | W06 · W10 · W11 · W14 · W15 |
| Painel | Agenda do dia · Agenda da semana por colaborador · Novo agendamento manual | P03 · P04 · P05 |
| App do colaborador | Agenda do dia · Detalhe com check-in e check-out | K01 · K02 |
| Colaborador desktop | Agenda do dia · Atendimento com check-in e check-out | KD1 · KD2 |
