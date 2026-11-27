# Research: Fechamento financeiro e repasses (018)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: PEN-14 (comissão repassada pelo split a todos os colaboradores; o fechamento confere repassado × calculado), PEN-09 (taxa por agendamento no split ou na fatura), PEN-03 (Gerente vê só a própria filial; o Proprietário pode retirar). Base: 007 (contrato de comissão, REQ-EQP-046), 012 (split, estornos, chargebacks, conciliação, livro financeiro), 017 (notas e exportação fiscal). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `settlement` do domínio `payments` (CONST 4.4 coloca repasses em `payments`), schema do tenant (REQ-FEC-040). Usa só contratos da 007 (cálculo de comissão), 012 (pagamentos, split, estornos, ledger) e 017 (notas); **nenhuma regra é recalculada de outra forma** (REQ-FEC-041): a linha do fechamento guarda o resultado do contrato da 007 com a versão congelada no agendamento.

## R2. Período

- **Decisão**: configuração por negócio `weekly` \| `biweekly` \| `monthly` (padrão), fechado à meia-noite local da filial (REQ-FEC-001). Tarefa no `workers` gera, ao fim do período, um `settlement_statement` em `draft` por colaborador ativo no período (REQ-FEC-002). Mudança de período vale do próximo em diante.

## R3. Linhas, ajustes e imutabilidade

- **Decisão**: linhas = atendimentos concluídos e pagos do período (data, serviço, valor pago, base, regra/versão, comissão). Estornos, chargebacks e correções de períodos aprovados entram como **ajustes do período atual** com referência ao original (REQ-FEC-003). Ajustes manuais (`bonus`, `deduction`, `advance`, `chair_fee`, `other`) com valor, tipo e motivo, auditados (REQ-FEC-004). Pendentes de registro ou pagamento aparecem em seção separada, fora do total (REQ-FEC-005). Aprovado → `approved` imutável (sem UPDATE; correções só por ajuste futuro). Total = Σ linhas + Σ ajustes em centavos, verificado por **teste de propriedade** (REQ-FEC-006).

## R4. Conferência e contestação

- **Decisão**: rascunho → aviso ao colaborador (011) → janela de contestação (padrão 3 dias, 1–10) → `in_review`. Contestação de linha ou ajuste com motivo; resposta pelo Proprietário ou Gerente da filial (com ajuste ou explicação) avisa o colaborador (REQ-FEC-010/011). Aprovar com contestação aberta é permitido com registro da decisão (REQ-FEC-012). Aprovação pelo Proprietário, delegável ao Gerente da filial (permissão `settlement.approve` na matriz) (REQ-FEC-013).

## R5. Repasse pelo split e conferência

- **Decisão**: com o PEN-14, a comissão dos pagamentos pela plataforma já foi repassada no split (012), inclusive a retida `pending_professional` liberada depois. O fechamento soma o **repassado** (partes `professional` do split no período) e compara com o **calculado**; a diferença vira ajuste do próximo período (REQ-FEC-023). O que **não** passa pelo split (comissão de pagamentos no local, ajustes manuais) gera **saldo a pagar** registrado manualmente: data, meio, valor, ator; parcial deixa saldo pendente; auditado (REQ-FEC-020/021). Aprovado com saldo a pagar há > 10 dias → lembrete ao Proprietário (REQ-FEC-025). Colaborador confirma o recebimento ou aponta divergência no app (REQ-FEC-022).
- **Alternativas**: transferir o saldo manual automaticamente pelo PSP (depende de saldo do recebedor do negócio no PSP; fica para depois).

## R6. Resumo do período e lista de verificação

- **Decisão**: resumo por filial e total: receita por meio (plataforma e no local), taxas do PSP, taxas da Koovela (split e fatura), comissões, ajustes, estornos, chargebacks, notas emitidas e pendentes, resultado do estabelecimento — calculado do livro financeiro da 012 e das notas da 017, e **batendo com eles** (teste de reconciliação, REQ-FEC-030). Lista de verificação: atendimentos sem registro, notas pendentes (017), divergências de conciliação (012), contestações abertas e repasses não registrados (REQ-FEC-031). "Concluir fechamento do negócio" registra data e ator; pendências passam ao período seguinte (REQ-FEC-032). Gerente vê só a própria filial (PEN-03).

## R7. Exportação e demonstrativo

- **Decisão**: planilha (`exceljs`) com resumo, linhas por colaborador, pagamentos e ajustes, empacotada com a exportação fiscal do período (017) (REQ-FEC-033). Demonstrativo do colaborador em PDF por período aprovado (REQ-FEC-034), gerado no `workers` (renderização HTML → PDF com Chromium headless já usado no CI de a11y).

## R8. Visão do colaborador

- **Decisão**: "Comissões" (K03/KD3) mostra previsto (rascunho + período corrente), a receber (aprovado não pago) e recebido, por período (REQ-FEC-024).

## R9. Eventos

- **Decisão**: `payments.settlement.*` com identificadores e valores, sem dados bancários (REQ-FEC-042).

## R10. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel | Repasses ao colaborador · resumo do período e lista de verificação | P21 (Financeiro) |
| App do colaborador | Comissões (conferência e contestação) | K03 |
| Colaborador desktop | Comissões | KD3 |
| Back-office | Consulta de fechamentos pelo Financeiro/Ops | G07 (faturamento) ou nova |
| A conferir | Contestação pelo colaborador e lista de verificação | Desenhar se não existirem |
