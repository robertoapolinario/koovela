# Research: Equipe, escalas e comissão (007)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 002 (schema por tenant), 003 (pessoa global, papel Colaborador), 004 (auditoria), 005 (filiais, horário, eventos de clonagem e onboarding), 006 (serviços e combos versionados). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: domínio `workforce` (CONST 4.4), tabelas `workforce_*` no schema do tenant; só a pessoa fica em `koovela_identity` (REQ-EQP-071).

## R2. Vínculo com várias filiais (PEN-04)

- **Decisão**: um **vínculo** por pessoa e negócio (tipo, início, fim); as filiais em que trabalha são definidas pelas **escalas** (uma por colaborador × filial × vigência). O mesmo horário em duas filiais é impedido por validação na escala (sobreposição de intervalos entre escalas do mesmo colaborador na mesma data) e, na reserva, pelo lock por `professional_id` da spec 008, que não depende da filial (REQ-EQP-002).
- **Alternativas**: um vínculo por filial (duplica dados e complica a comissão).

## R3. Intervalos de trabalho para o motor de agenda

- **Decisão**: `GET /v1/internal/workforce/professionals/{id}/work-intervals?branch_id&from&to` devolve, em **UTC**, `escala ∩ horário da filial − folgas aprovadas − bloqueios`, com exceções de troca aplicadas (REQ-EQP-023). O horário da filial vem de uma projeção local (`workforce_branch_hours_view`) alimentada por `tenancy.branch.hours_changed.v1`, sem leitura da tabela do `tenancy`. Conversão de hora local para UTC por data com a base de fusos IANA (horário de verão histórico tratado). Cada mudança de insumo publica `workforce.availability.changed.v1` com a faixa de datas afetada, para a 008 invalidar o cache.
- **Por quê**: Princípio VII e CONST XI (UTC no banco, local na borda).

## R4. Agendamentos afetados sem cancelar

- **Decisão**: mudar escala, aprovar folga ou lançar bloqueio nunca cancela (REQ-EQP-022). O `workforce` publica `workforce.availability.changed.v1`; a lista de afetados vem do contrato de consulta da spec 009 (`appointments in window for professional`), mostrada na tela antes de confirmar. Até a 009, a tela informa "verificação indisponível".

## R5. Folgas e trocas

- **Decisão**: `workforce_time_off` com estados `requested` → `approved` \| `rejected` \| `expired` (sem decisão até o início) e `direct` (lançado por Gerente ou Proprietário, vale na hora). Tipos sem dado de saúde; motivo livre com aviso e sem anexo (REQ-EQP-034). Troca: `workforce_shift_swap` `proposed` → `accepted_by_peer` → `approved` \| `rejected` \| `cancelled`; aprovação só quando os agendamentos dos dois dias estão resolvidos (consulta à 009), gerando exceções de escala para os dois.

## R6. Comissão: regra, precedência e cálculo

- **Decisão**:
  - Regras versionadas (`workforce_commission_rule_version`) por nível `business` \| `professional` \| `service` \| `professional_service`, com percentual em **pontos-base** (0–10000, inteiro), piso e teto em centavos; precedência colaborador+serviço > serviço > colaborador > padrão (REQ-EQP-040).
  - Configuração por negócio, também versionada: `base = full | discounted` ([D17], com exemplo numérico na tela) e `deduct_payment_fees` (padrão não).
  - Arrendatário de estação: a regra guarda a **cota do estabelecimento**, e a comissão é o complemento (REQ-EQP-043).
  - Cálculo puro e determinístico (`packages/domain/commission`, sem I/O), com os seguintes passos:
    1. base = cheio ou com desconto;
    2. desconta as taxas, se configurado;
    3. comissão = `floor(base × bps / 10000)`;
    4. aplica piso e teto;
    5. o resto vai para o estabelecimento (REQ-EQP-044).
  - Insumos especiais: combo usa o rateio por etapa da 006; sessão de pacote usa `floor(total / N)`, com o resto na última sessão.
  - Contrato `POST /v1/internal/workforce/commission/quote` (REQ-EQP-046), usado por 009, 012, 018 e pelo simulador. A 009 congela a versão da regra na criação do agendamento (REQ-EQP-045).
- **Verificação**: testes de propriedade:
  - comissão + parte do estabelecimento = base;
  - nunca negativo;
  - piso ≤ comissão ≤ teto.
- **Alternativas**: percentual em decimal (risco de float, CONST III).

## R7. Comissão via split para todos (PEN-14)

- **Decisão**: o colaborador tem `payee_ref` (recebedor no PSP) criado pelo fluxo de recebedor da spec 012; esta spec só mostra o estado ("verificado", "pendente") e o atalho para concluir o cadastro (REQ-EQP-048). Sem recebedor verificado, a comissão fica retida no recebedor do negócio como pendente (REQ-PAG-043). **Risco registrado**: enquadramento do CLT a validar com contador e jurídico.

## R8. Comissão no app do colaborador

- **Decisão**: a prévia ("previsto") vem de uma projeção `workforce_commission_entry` alimentada por eventos de agendamento (009) e de pagamento (012): lançamentos `accrued`, `adjustment` (estorno ou cancelamento, sempre linha nova, REQ-EQP-051), e mais tarde `transferred` (spec 018). A tela K03/KD3 mostra semana, mês e o detalhe; o Colaborador só vê os próprios lançamentos (REQ-EQP-052).

## R9. Colaborador do autônomo e clonagem

- **Decisão**: consumidor de `tenancy.client.onboarded.v1` com `path=solo` cria colaborador + vínculo `owner_operator` e escala igual ao horário de trabalho do onboarding (REQ-EQP-006). `tenancy.branch.cloned.v1`: as regras de comissão são por negócio (não por filial), então a clonagem não copia regras; copia apenas as escalas modelo se o Proprietário pedir (opcional na tela). **Ajuste anotado**: REQ-NEG-021 cita "regras de comissão" na clonagem; elas já valem para todas as filiais.

## R10. Prontidão de publicação

- **Decisão**: o primeiro colaborador ativo com pelo menos um serviço e escala vigente emite `workforce.professional.availability_set.v1`, consumido pela prontidão da spec 005.

## R11. Perfil, portfólio e registro profissional

- **Decisão**: até 30 fotos de portfólio pelo `packages/platform/media` (remove EXIF e geolocalização, REQ-EQP-061), com declaração de autorização de imagem guardada (versão do texto, horário); aprovação opcional por negócio (padrão: exige). Em saúde, conselho, número de registro e UF obrigatórios para exibir o colaborador publicamente (REQ-EQP-004).

## R12. Telas (Figma)

| Superfície | Tela | Código |
|---|---|---|
| Painel | Horários e colaboradores (onboarding) · Colaboradores · Regras de comissão · Escalas, folgas e bloqueios | O04 · P15 · P16 · P17 |
| App do colaborador | Comissões · Folgas e trocas · Perfil e portfólio | K03 · K04 · K05 |
| Colaborador desktop | Comissões · Folgas e trocas · Perfil e portfólio | KD3 · KD4 · KD5 |
| Consumidor | Escolha de profissional | C06 · W09 |
