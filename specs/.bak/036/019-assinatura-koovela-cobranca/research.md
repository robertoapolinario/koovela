# Research: Assinatura Koovela e cobrança (019)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: PEN-08 (tudo configurável no back-office: valores, faixas, política do autônomo, base da taxa, funções por plano; sem plano gratuito e sem valor no código), PEN-09 (taxa retida no split quando o pagamento passa pela Koovela; na fatura quando é no local), SMS transacional pago pelo tenant (cota no plano + excedente na fatura). Base: 002 (suspensão e arquivamento), 004 (auditoria, aprovação dupla), 012 (`PaymentProvider`, split, ledger), 017 (`FiscalProvider`), 021 (degustação e concessões), 022 (exportação). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: domínio `billing` (CONST 4.4) no schema `koovela_platform` (REQ-ASS-050), ligado ao `tenant_id`; o tenant só lê as próprias assinaturas e faturas (filtro pelo tenant resolvido no gateway, nunca pelo cliente). Contratos de consulta (plano vigente, faixas, funções, estado) publicados para 005, 014, 021 e 028 (REQ-ASS-051/052), com cache curto em Redis invalidado por evento.

## R2. Planos versionados e sem números no código

- **Decisão**: `billing_plan` + `billing_plan_version` imutável: preço mensal, faixas (colaboradores, filiais), taxa por agendamento (`fixed_cents` ou `bps`), base da taxa (padrão inicial: concluídos e pagos), funções incluídas (padrão inicial: todas), cota de SMS, preço do excedente, política do autônomo, vigência (REQ-ASS-001/002/003). Nenhum valor padrão no código: o seed de dev cria planos fictícios só no ambiente local. Funções por plano são resolvidas aqui, **não** por feature flag (REQ-FLG-015). Mudança de preço não afeta o ciclo em curso; aumento exige aviso de 30 dias (`effective_from ≥ hoje + 30` validado) (REQ-ASS-004). Mudanças de plano, preço e régua pelo Comercial/Growth exigem aprovação do Financeiro/Ops (fluxo de aprovação dupla da 004) (REQ-ASS-041).

## R3. Assinatura e ciclo

- **Decisão**: uma assinatura por tenant, ciclo mensal ancorado na data de ativação, forma de pagamento `card_recurring` (token no PSP, como a REQ-PAG-003) ou `pix_invoice`; troca com step-up e auditoria (REQ-ASS-010/011). Subir de plano vale na hora, com proporcional por dias na próxima fatura; descer vale no próximo ciclo se o uso couber (REQ-ASS-012). Exceder faixa bloqueia só novos convites e novas filiais (contrato consultado pela 005 e 007), nunca o existente nem o consumidor (REQ-ASS-013). Cancelamento: `cancel_scheduled` até o fim do ciclo pago → suspensão → arquivamento em 90 dias (002), com exportação (022) e reativação em 90 dias (REQ-ASS-014). Degustação e concessões (021) aplicadas aqui: estado `trialing`, descontos como itens na fatura, aviso 7 dias antes do fim (REQ-ASS-015).

## R4. Fatura

- **Decisão**: `billing_invoice` em `open` durante o ciclo, acumulando itens por evento:
  - assinatura (proporcional quando couber);
  - taxa por agendamento dos **pagamentos no local** (cobrada) — de `payments.payment.on_site_recorded.v1` + conclusão;
  - taxas **retidas no split** (informativas, valor zero no total) — de `payments.payment.approved.v1`;
  - excedente de SMS (de `notification.delivery.*`, só SMS transacional faturável);
  - descontos, concessões, créditos;
  - tipo de item extensível (`usage:<code>`) para CRM (028) e destaque (032) sem migração destrutiva (REQ-ASS-026).
  
  Ao fim do ciclo → `issued` com total em centavos (REQ-ASS-020/021). Itens idempotentes por `(source_kind, source_id)`. Taxa de agendamento estornado ou cancelado depois do fechamento → crédito na seguinte (REQ-ASS-025).

## R5. Cobrança e nota

- **Decisão**: cobrança pelo `PaymentProvider` da 012 com `Idempotency-Key = invoice_id:attempt` (REQ-ASS-022): cartão cobrado no vencimento; Pix com QR enviado 5 dias antes (011). Fatura paga > 0 → nota da Koovela ao tenant pelo `FiscalProvider` da 017, **Koovela emitente** (é o serviço da própria Koovela, sem conflito com a CONST 5) (REQ-ASS-023). Esta é a primeira emissão em nome da Koovela: perfil fiscal e certificado da Koovela no `koovela_platform`, com os mesmos cuidados de segredo da 017.

## R6. Régua de inadimplência

- **Decisão**: máquina de estados dirigida por tarefa diária no `workers`, com cada etapa idempotente e registrada (REQ-ASS-030):

  | Dia após vencimento | Ação |
  |---|---|
  | 1, 3, 5 | Nova tentativa no cartão + aviso ao Proprietário |
  | 7 | `restricted`: aviso permanente no painel; sem novas filiais, convites e ativação de funções (REQ-ASS-031) |
  | 15 | `suspended`: comando de suspensão da 002 — consumidor sem novos agendamentos (mensagem neutra), confirmados honrados; painel só pagar, exportar e suporte (REQ-ASS-032) |
  | 75 | Aviso de encerramento em 15 dias |
  | 90 | `ended`: tenant `archived` (002) |

  Pagamento em atraso (webhook do PSP) reativa em ≤ 5 min (consumidor do evento → comando `reactivate` da 002) (REQ-ASS-033). Pausa da régua pelo Financeiro/Ops com motivo, prazo e auditoria (REQ-ASS-034). Nenhuma etapa apaga dados (REQ-ASS-035).

## R7. Back-office

- **Decisão**: G07 (Planos, cobrança e inadimplência): criar e versionar planos (com aprovação), lista de inadimplência por dias de atraso e valor, etapa e histórico, ações (pausar, acordo — fatura `cancelled` e nova fatura —, nova cobrança) (REQ-ASS-040).

## R8. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel | Assinatura Koovela e faturas · escolha de plano · avisos de restrito e suspensão | Em Configurações (P26) — código próprio a conferir |
| Painel (onboarding) | Escolha de plano e forma de pagamento | O01–O05 (etapa a conferir) |
| Back-office | Planos, cobrança e inadimplência | G07 |
