# Research: Fidelidade (015)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: PEN-16 (o negócio escolhe pontos por real — padrão 1 pt/R$ 1 — ou por visita/cartão de selos; validade 12 meses; teto definido pelo negócio), PEN-17 (o negócio escolhe saldo único ou por filial), PEN-03 (Gerente configura a própria filial), PEN-06 (saúde sem desconto em dinheiro). Base: 009 (conclusão, versões congeladas), 010 (política), 012 (split, estorno, pagamento no local). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: domínio `loyalty` (CONST 4.4), schema do tenant, por negócio; pontos de um negócio nunca valem em outro (REQ-FID-033). O livro-razão de pontos é do `loyalty` (REQ-FID-030), separado do livro de saldos da 012 (pontos não são dinheiro nem sessão).

## R2. Mecânicas e versões

- **Decisão**: `loyalty_program_version` imutável, com:
  - **mecânica** `points_per_real` (pontos por real em décimos de ponto por real, padrão 10 = 1 pt/R$; bônus fixo por atendimento opcional) ou `stamps` (N atendimentos → recompensa);
  - **tiers** (até 4: critério em pontos dos últimos 12 meses, multiplicador de 1,0 a 2,0 guardado em centésimos 100–200, texto);
  - **catálogo** (tipo `free_service` \| `discount_cents` \| `discount_pct`, serviços, custo em pontos, valor em reais para o estabelecimento, tier mínimo, estoque mensal, validade);
  - **expiração** (padrão 12 meses);
  - **teto de custo mensal** obrigatório;
  - **modo do saldo** (`business` \| `branch`).
  
  O agendamento congela a versão vigente (REQ-FID-007). Limites da plataforma no back-office, sem número no código.
- **Saúde**: o catálogo só aceita `free_service` e brinde; nenhuma tela mostra preço (REQ-FID-008).

## R3. Acúmulo

- **Decisão**: consumidor de `scheduling.appointment.completed.v1` + `payments.payment.approved.v1`:
  - **por real**: `floor(valor_pago_sem_resgate × taxa × multiplicador_do_tier)`, em pontos inteiros;
  - **por visita**: +1 selo por atendimento concluído e pago.
  
  Pagamento no local conta se o negócio permitir (REQ-FID-011). Pacote gera pontos na compra; as sessões do pacote não geram (REQ-FID-012). O lançamento fica ligado ao **titular pagante**, para os atendidos da fase 2 (REQ-FID-032). Idempotência por `(appointment_id, kind)`.

## R4. Livro-razão de pontos

- **Decisão**: `loyalty_account` (por consumidor e negócio, ou por filial conforme o modo) com saldo materializado atualizado **na mesma transação** de cada `loyalty_entry` imutável (`credit` \| `bonus` \| `reserve` \| `consume` \| `release` \| `expire` \| `reversal` \| `adjust`), conta travada `FOR UPDATE`, `CHECK (available ≥ 0)` (REQ-FID-023/030). Estorno com pontos já usados vira `debt_points`, abatida dos próximos créditos; o disponível exibido nunca é negativo (REQ-FID-013). Expiração FIFO por lote de crédito, com aviso 30 dias antes (REQ-FID-014). Troca de modo de saldo vale só para pontos ganhos depois (REQ-FID-031).

## R5. Resgate

- **Decisão**: no resumo do agendamento (C08/W11), o consumidor escolhe a recompensa e vê preço e saldo; a confirmação **reserva** os pontos; a conclusão **consome**; cancelamento dentro da política e não comparecimento **devolvem** (REQ-FID-020/021). Resgate no balcão (K02/KD2) pede confirmação no celular do consumidor: push com aprovação ou OTP (REQ-FID-022). Desconto do resgate entra no split como desconto do estabelecimento e na comissão pela base da `[D17]`; "serviço grátis" registra pago zero e o valor da recompensa como custo do programa (REQ-FID-024). Multa de falta com resgate sobre o preço cheio (REQ-FID-025).

## R6. Tiers

- **Decisão**: subida imediata ao atingir o critério; queda só na **revisão anual de cada consumidor** (aniversário da entrada no programa), tarefa diária no `workers` (REQ-FID-003).

## R7. Simulador e teto

- **Decisão**: o simulador é obrigatório antes de ativar e depois de cada mudança. Ele usa os últimos 6 meses de atendimentos do negócio (eventos da 009/012) e estima:
  - pontos emitidos;
  - custo de resgate (com taxa de resgate presumida configurável);
  - valor em aberto;
  - receita incremental para empatar (REQ-FID-005).
  
  O teto de custo mensal é obrigatório: a 80% avisa o Proprietário e a 100% pausa o catálogo até o mês seguinte (REQ-FID-006).

## R8. Painel e receita incremental

- **Decisão**: painel mensal com emitidos, resgatados, expirados, custo, valor em aberto, participantes ativos, uso do teto e razão custo/receita incremental. A receita incremental compara recompra em 90 dias e gasto médio de participantes contra não participantes do mesmo negócio, ou contra o período anterior à ativação; o método aparece na tela (REQ-FID-050/051).

## R9. Abuso, ajustes e encerramento

- **Decisão**:
  - **Ajuste manual**: exige motivo e fica na trilha de auditoria; acima de 1.000 pontos, pede step-up (REQ-FID-052).
  - **Detecção de abuso** (REQ-FID-053), com alerta e pontos `pending_review` até a revisão:
    - pagamentos no local repetidos no mesmo dia para o mesmo consumidor;
    - acúmulo semanal acima de 5× a média;
    - resgates sucessivos sem atendimento.
  - **Sem conversão nem transferência**: pontos nunca viram dinheiro nem passam para outro consumidor; na exclusão da conta, são encerrados (REQ-FID-054).
  - **Desligar o programa**: para o acúmulo e mantém o resgate por 90 dias, com aviso (REQ-FID-055).

## R10. Permissões

- **Decisão**: Proprietário configura; Gerente configura e vê o resultado só da própria filial, salvo retirada pelo Proprietário (PEN-03); Recepção e Colaborador só fazem resgate no balcão.

## R11. Telas

| Superfície | Tela | Código |
|---|---|---|
| App / web do consumidor | Fidelidade: pontos, tier e catálogo · resgate no Resumo | C15 · C08 · W17 · W11 |
| Painel | Fidelidade: regra, tiers, catálogo e simulador · resultado | P20 |
| Colaborador | Resgate no check-out | K02 · KD2 |
| Back-office | Limites e alertas de abuso | Sem código (nova) |
| A conferir | Confirmação do resgate no celular do consumidor | Desenhar se não existir |
