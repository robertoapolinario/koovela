# Research: Política de cancelamento e não comparecimento (010)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 005 (taxa de agendamento de saúde, vertical), 006 (preço congelado), 009 (máquina de estados, resumo, versões congeladas). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `policy` do domínio `scheduling` (a CONST 4.4 não cria domínio próprio; a política decide o que o agendamento pode fazer). Tabelas `scheduling_policy_*` no schema do tenant (REQ-POL-041). A execução em dinheiro (reter, cobrar, devolver) é do `payments` (012), acionada por eventos e comandos.

## R2. Política versionada e congelada

- **Decisão**: `scheduling_policy` estável por negócio + `scheduling_policy_version` imutável com todas as regras (REQ-POL-001), o **modo do sinal por serviço** (sem sinal, para todos, só consumidor novo ou com falta nos últimos 90 dias — PEN-15), valor do sinal (10–100% ou fixo, prazo 5–30 min limitado pela reserva temporária), regra "exigir sinal depois de N faltas", **forma da multa** escolhida pelo estabelecimento entre as permitidas no back-office (PEN-13) e o **texto exibido** com hash. Modelos por vertical semeados (beleza 2 h, saúde 24 h, sem multa, sem sinal; REQ-POL-002). A 009 congela `policy_version_id`; remarcação herda (REQ-POL-010).
- **Formas permitidas**: `platform_setting.no_show_fee_forms` = subconjunto de `retain_deposit`, `retain_deposit_and_charge_card`, `record_only`, editado pelo back-office.

## R3. Saúde: taxa de agendamento no lugar do sinal

- **Decisão**: negócio com `price_display = never` usa a **taxa de agendamento fixa** do negócio (005) como sinal único, sempre exigida (não há modos), devolvida no cancelamento dentro da janela gratuita, retida na falta ou no cancelamento tardio e abatida do valor do atendimento (REQ-POL-003). A multa nunca pode ser maior que a taxa em saúde (não há preço exibido para calcular multa percentual); a consequência mostrada é "a taxa de agendamento fica com o estabelecimento".

## R4. Contrato de consequência

- **Decisão**: função pura `evaluatePolicy(policyVersion, appointment, now, consumerHistory)` em `packages/domain/policy` devolve `{ can_cancel, can_reschedule, reschedules_left, consequence: { kind: free | late_fee | no_show_fee | deposit_retained | session_consumed, fee_cents, deposit_refund_cents, retained_cents }, deadline_free_at }` (REQ-POL-020). Exposta como contrato interno, usada pela 009 antes de cada ação e no resumo, e pelo app para mostrar a consequência.
- **Cálculo** (REQ-POL-023/024/025):
  - multa = `floor(preço_congelado × pct / 100)`, sobre o mínimo no "a partir de" e sobre o preço do combo no combo;
  - com sinal maior que a multa, retém-se a multa e devolve-se o resto;
  - agendamento por pacote: falta consome a sessão, sem cobrança em dinheiro;
  - cancelamento pelo estabelecimento nunca gera multa (REQ-POL-026).
- **Verificação**: testes de propriedade:
  - retido + devolvido = sinal pago;
  - multa ≤ preço;
  - nunca negativo.

## R5. Aceite

- **Decisão**: na confirmação (009), grava `scheduling_policy_acceptance` com versão, SHA-256 do texto exibido (calculado no servidor a partir do mesmo modelo renderizado para o cliente), IP, aparelho e horário (REQ-POL-011). No agendamento manual, o aviso (011) leva a política e a equipe marca "informei a política"; sem aceite nem essa confirmação, a multa vira `record_only` (REQ-POL-012).

## R6. Multas, contador, abono e contestação

- **Decisão**:
  - Multa (`scheduling_policy_fee`) com estados `applied` → `suspended` (contestação aberta) → `charged` (pela 012) \| `reverted` \| `waived`.
  - Contador de faltas por consumidor e negócio (REQ-POL-029), visível só à equipe do negócio.
  - Abono por Recepção, Gerente ou Proprietário com motivo, auditado (REQ-POL-030).
  - Contestação pelo consumidor: em até 7 dias da multa, ou "não fui atendido" em até 48 h. Vai para a fila da filial; sem decisão em 7 dias, é aceita automaticamente; multa não cobrada fica suspensa enquanto pendente (REQ-POL-031/032).
  - Correção de falta (009) reverte multa e contador (REQ-POL-033).
  - Toda multa aplicada, revertida ou abonada avisa o consumidor (011).

## R7. Integração com a fila de espera

- **Decisão**: cancelamento tardio ou dentro do horário futuro publica `scheduling.policy.slot_freed_late.v1` para a 014 (REQ-POL-028).

## R8. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel | Política de no-show · detalhe do agendamento na agenda (multa, abono, contestação) | P19 · P03 |
| App do consumidor | Resumo e política · Remarcar e cancelar | C08 · C13 |
| Web do consumidor | Resumo e política · Remarcar e cancelar | W11 · W15 |
| Novas (sem código no Figma) | Contestar multa (consumidor) · Fila de contestações (painel) | Desenhar no protótipo |
