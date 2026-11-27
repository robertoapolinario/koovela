# Research: Destaque pago na vitrine (032)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D36 (fase 3), D37 (pacote fixo por período, por bairro e categoria, faixa separada "Patrocinado", inventário limitado, lista orgânica intocada), PEN-26 (ordenação orgânica da 024, inalterada), PEN-30 (valores configuráveis no back-office, sem padrão no código — CONST 8), PEN-06 (saúde: destaque permitido, sem preço). Base: 004 (aprovação dupla e auditoria), 009 (origem do agendamento), 012 (`PaymentProvider`, estorno), 017 (`FiscalProvider`, Koovela emitente), 019 (forma de pagamento da assinatura, estado de inadimplência, cobrança e nota), 021 (back-office), 023 (BI), 024 (`discovery_region`, `discovery_participation`, `discovery_listing`, busca e moderação). Restrição: custo zero, nenhum serviço novo. Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e fronteiras

- **Decisão**: submódulo `sponsored` do domínio `discovery`, no schema global `koovela_discovery` (inventário, preços, destaques, estatísticas) (REQ-DST-040). A cobrança, o estorno e a nota ficam no `billing` (019), em `koovela_platform`, acionados por contrato interno com idempotência pelo `sponsorship_id`. O pipeline orgânico da 024 (`search`, `ranking`) **não importa** o submódulo `sponsored` (regra de lint de fronteira de módulo): a faixa é montada depois, por outro componente, e anexada à resposta em campo separado.
- **Por quê**: D37 exige que a lista orgânica não mude; a separação física de código torna a garantia verificável, além do teste comparativo (REQ-DST-011).
- **Alternativas**: boost no ranking com flag "patrocinado" (viola D37); serviço separado (complexidade sem ganho).

## R2. Inventário e concorrência

- **Decisão**: inventário configurado por **região aberta da 024** (`discovery_region`, bairro) e **categoria** da taxonomia (024), com `capacity` simultânea (padrão inicial 3, editável). A ocupação é materializada por dia em `discovery_sponsored_inventory_day (region_id, category, day, sold)`. A compra, numa única transação MySQL, faz para cada dia do período, **em ordem crescente de data**, `UPDATE … SET sold = sold + 1 WHERE … AND sold < capacity` (linhas criadas sob demanda com `INSERT … ON DUPLICATE KEY`); se algum dia afetar 0 linhas, rollback e resposta `sponsored.sold_out` com a próxima data de início disponível (REQ-DST-002). A ordem fixa evita deadlock entre compras sobrepostas.
- **Capacidade reduzida** abaixo do já vendido não afeta destaques existentes; só bloqueia novas vendas nesses dias. Invariante: `sold ≤ capacity` vigente na data da venda.
- **Disponibilidade** (calendário): leitura de `capacity - sold` por dia nos próximos 90 dias; "próxima data disponível" = primeiro dia `d` tal que todos os dias `d … d+duração-1` têm espaço.
- **Por quê**: SC-003 (nunca vender além do configurado) com o banco já existente; teste de concorrência com N compras paralelas pelo último espaço.
- **Alternativas**: lock em Redis (falha se Redis cair; o banco já garante); contagem por consulta agregada com `SELECT … FOR UPDATE` (lock de faixa mais amplo).

## R3. Pacotes e preços (PEN-30)

- **Decisão**: `discovery_sponsored_offer_version` imutável por (região, categoria) ou por escopo mais amplo (cidade, ou "todas") com resolução do mais específico para o mais geral; contém `capacity`, a lista de pacotes (`duration_days`, `price_cents`) e `effective_from`. **Nenhum valor no código**: sem versão vigente aplicável, o destaque não é oferecido naquele bairro e categoria. Proposta pelo Comercial/Growth com **aprovação do Fin/Ops** (fluxo de aprovação dupla da 004); Fin/Ops pode publicar direto (REQ-DST-030, Permissões). O preço é **congelado** no destaque comprado (`price_cents_paid`, `offer_version_id`) — mudança vale só para compras novas (REQ-DST-032). Seed de dev cria versões fictícias só no ambiente local (como na 019).
- **Alternativas**: preço no plano da assinatura (019) — mistura receitas distintas e acopla o ciclo mensal.

## R4. Elegibilidade

- **Decisão**: contrato de elegibilidade avaliado na abertura da tela e de novo na compra (REQ-DST-004):
  1. `discovery_participation.state = active` da filial (024) e `missing_requirements` vazio (perfil completo);
  2. assinatura (019, `getEntitlements`) fora de `past_due`, `restricted`, `suspended`, `ended` — sem fatura em atraso;
  3. a filial está dentro do polígono da região escolhida e tem a categoria escolhida;
  4. existe versão de oferta vigente para a região e a categoria;
  5. saúde (`is_health`): permitido; o cartão da faixa usa o mesmo documento de listagem, que já não tem preço nem avaliação (PEN-06).
  Cada falha devolve um código de motivo exibido ao Proprietário.

## R5. Compra, cobrança e nota

- **Decisão**: saga com outbox (CONST IX):
  1. `discovery` valida elegibilidade, reserva o inventário (R2) e cria o destaque em `pending_payment` com expiração de 15 min (estado técnico, fora do ciclo de negócio da spec);
  2. chama `billing` (`POST /internal/billing/one-off-charges`, `Idempotency-Key = sponsorship_id`), que cria uma **fatura avulsa** (`billing_invoice.kind = one_off`, item `usage:sponsored_slot`) e cobra pela forma de pagamento da assinatura: cartão recorrente → cobrança imediata pelo `PaymentProvider` (012); Pix → QR exibido na tela, válido pelos 15 min da reserva;
  3. `billing.sponsored_slot.charged.v1` → destaque `reserved`; nota da Koovela pelo `FiscalProvider` (017) (REQ-DST-003, REQ-ASS-023);
  4. falha ou expiração → libera o inventário (decremento dia a dia, idempotente) e destaque `expired` (técnico).
  A confirmação exige **reautenticação com segundo fator** (REQ-IDN-022) antes do passo 1.
- **Por quê**: SC-004 (≤ 2 min) com cartão; Pix não prende espaço indefinidamente.
- **Alternativas**: lançar o valor na fatura mensal (contraria "cobrado na hora" da spec).

## R6. Ciclo de vida, pausa e reembolso

- **Decisão**: máquina de estados da spec (`reserved` → `active` ↔ `paused` → `ended`; `reserved` → `cancelled`; `active` → `partially_refunded`), dirigida por:
  - tarefa no `workers` à 00:00 America/Sao_Paulo: `reserved` → `active` no dia de início; `active`/`paused` → `ended` após o último dia;
  - eventos: `discovery.participation.changed` (pausa/saída/retirada), `billing.subscription.changed` (suspensão por inadimplência), sem horários (`slots_next_7d = 0` na listagem) → `paused` com motivo; volta → `active`. **Sem reembolso nem extensão** quando a causa é do estabelecimento (REQ-DST-014).
  - **Moderação** (024): retirada → `paused` (`moderation`); denúncia confirmada → permanece pausado até o fim, sem reembolso; **improcedente** → compensação: estende o fim pelos dias suspensos se houver inventário contíguo; senão, crédito proporcional na próxima fatura (item `credit` da 019) (REQ-DST-033).
  - **Cancelamento pelo Proprietário**: ≥ 48 h antes do início (relógio do servidor, fuso America/Sao_Paulo, início = 00:00 do dia) → `cancelled`, estorno integral pelo `PaymentProvider` e cancelamento/nota de crédito pelo `FiscalProvider`, inventário liberado; depois disso → sem reembolso (REQ-DST-005).
  - **Região fechada pela Koovela** (`discovery.region.changed` para `closed`) → `partially_refunded` com estorno de `price × dias_não_exibidos / duração` (arredondamento a favor do estabelecimento, centavos).
  - Reembolsos fora da regra: ação do Fin/Ops, auditada (004).
- Todas as transições e mudanças de inventário/preço vão para a trilha de auditoria (REQ-DST-034).

## R7. Exibição da faixa

- **Decisão**: a resposta de `search` e `home` (024) ganha o campo `sponsored` separado de `results`. Montagem:
  1. resolve a região da busca (bairro aberto) e a categoria (filtro explícito ou categoria inferida da consulta pela taxonomia); sem região ou categoria resolvida → faixa vazia;
  2. obtém o conjunto de destaques `active` da (região, categoria) — cache Redis de 60 s invalidado por evento;
  3. aplica **os mesmos filtros da busca** via Meilisearch com `filter = branch_id IN [...] AND <filtros>` (REQ-DST-013);
  4. **rotação justa**: com `n` elegíveis e `k` itens visíveis, desloca a janela por `INCR` de um contador Redis por (região, categoria) — cada destaque aparece em `k/n` das exibições, sem preferência (REQ-DST-012);
  5. cada item é um cartão da listagem pública com `sponsored: true`, selo "Patrocinado" e link "Por que estou vendo isto?" com a explicação fixa (REQ-DST-010). Faixa vazia não é renderizada.
  - Itens visíveis por superfície configuráveis no back-office (ASSUMIDO: 3 na web, 2 no app).
  - O negócio em destaque continua na sua posição orgânica (o pipeline orgânico não sabe da faixa).
- **Garantia D37** (REQ-DST-011, SC-001): teste de propriedade que roda o mesmo conjunto de buscas com e sem destaques ativos e compara `results` byte a byte; lint de fronteira (R1); teste de contrato garante `sponsored` presente em 100% dos itens da faixa e ausência de preço em saúde.
- **Acessibilidade**: selo com texto (não só cor), `aria-label` "Patrocinado", faixa como região nomeada; WCAG 2.1 AA.

## R8. Medição e atribuição

- **Decisão**:
  - **Exibição**: contada no servidor quando o item entra na faixa servida (cookieless, como a medição da 024 R9); no app, que pré-carrega, um beacon em lote com só `sponsored_id` confirma itens efetivamente renderizados. **Toque**: `POST /v1/public/discovery/sponsored/{id}/click` (sem identificador do consumidor), que devolve um **token de atribuição** assinado `(sponsorship_id, nonce, exp)` guardado na sessão (sessionStorage na web; memória no app — "mesma sessão", REQ-DST-021). Agregação em Redis por (destaque, dia, métrica), descarregada a cada minuto em `discovery_sponsored_daily_stats` e emitida como `impression_counted.v1`/`clicked.v1` em lote agregado (nunca por consumidor). Filtro básico de robôs (user-agent conhecido e limite por IP sem gravar o IP).
  - **Visita**: abertura da página do estabelecimento com o token presente.
  - **Agendamento**: o fluxo de agendamento em uma tela (024) repassa o token; a 009 grava `origin = discovery` e `origin_ref = sponsored:<sponsorship_id>` (extensão aditiva no contrato da 009: novo valor `discovery` já previsto na 024 e campo opcional `origin_ref`). O `discovery` consome os eventos de agendamento com `origin_ref` de destaque (só `appointment_id`, estado e valor em centavos, sem consumidor) e soma agendamentos e receita (atendimentos concluídos) por dia (REQ-DST-020).
  - Resultado ao Proprietário: tabela diária + totais, em ≤ 2 toques a partir de "Destaque na vitrine" (SC-005); agregados nunca identificam consumidores (REQ-DST-040).
- **Alternativas**: atribuição entre sessões por cookie (fora do escopo e contra a política de cookies mínimos).

## R9. Back-office

- **Decisão**: tela "Parceiros e inventário de destaques" (parte de inventário; a parte de parceiros é da 038) em `admin-web`: versões de oferta por região e categoria (proposta/aprovação), capacidade, itens visíveis por superfície, ocupação por dia (heatmap), taxa de ocupação (`Σ sold / Σ capacity` no período) e receita (do `billing`, faturas avulsas pagas menos estornos), lista de destaques com ações de reembolso fora da regra (Fin/Ops) (REQ-DST-031). Métricas de receita e renovação também no BI (023).

## R10. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel do cliente | Destaque na vitrine (compra, calendário, resultado) | Nova (DF 9.11) — a conferir no Figma |
| App do consumidor | Faixa de destaques na aba Início e nos resultados | Componente na C00 — a conferir |
| Web do consumidor | Faixa nos resultados e na home | Componente — a conferir |
| Back-office | Parceiros e inventário de destaques (inventário) | Nova (DF 9.11) |
