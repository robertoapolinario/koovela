# Quickstart de validação: Assinatura Koovela e cobrança (019)

Pré-requisitos: specs 001–018 no ar; adaptadores `fake` do PSP e fiscal; relógio controlável nos testes (`pnpm koovela clock set`). Contratos em [contracts/](./contracts/).

## 1. Planos (G07)

Comercial/Growth propõe plano "Estúdio" → aguarda aprovação; Financeiro/Ops aprova → ativo. Proposta de aumento com 10 dias de antecedência → `billing.increase_notice_too_short`. Busca no código por preços fixos → nenhum (`pnpm lint:no-hardcoded-prices`).

## 2. Assinatura

Onboarding: escolher plano e cartão (step-up) → `active`. Subir de plano no dia 10 → vale na hora e proporcional na próxima fatura. Descer com uso acima da faixa → `billing.usage_exceeds_target_tier`. Convidar além da faixa → convite bloqueado com sugestão de subir; agendamentos dos consumidores normais.

## 3. Fatura do ciclo

Ciclo com 3 atendimentos pagos no local e 10 pela plataforma, 40 SMS acima da cota: fatura com assinatura, 3 taxas cobradas, 10 informativas (retidas no split), excedente de SMS. Reprocessar eventos → itens não duplicados. Estorno depois do fechamento → crédito na próxima. Fatura paga → nota da Koovela ao tenant.

## 4. Régua

Cartão recusado no vencimento → novas tentativas nos dias 1, 3 e 5 com aviso; dia 7 `restricted` (aviso permanente; sem novas filiais, convites, funções); dia 15 `suspended` (página com mensagem neutra, confirmados honrados, painel só pagar/exportar/suporte). Pagar → reativado em ≤ 5 min, sem perda de dados. Pausar a régua (Financeiro/Ops) → etapas param, auditado. Dia 75 aviso; dia 90 arquivado (dados preservados).

## 5. Cancelamento e degustação

Cancelar → vale até o fim do ciclo pago, depois suspensão; reativar em até 90 dias. Degustação → `trialing`, aviso 7 dias antes do fim.

## 6. Isolamento

Tenant A tenta ler fatura do tenant B → 404 (teste da matriz).
