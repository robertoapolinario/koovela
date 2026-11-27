# Quickstart de validação: Fidelidade (015)

Pré-requisitos: specs 001–014 no ar; negócio de beleza com 6 meses de atendimentos sintéticos; negócio de saúde. Contratos em [contracts/](./contracts/).

## 1. Configurar e simular (P20)

Beleza: "pontos por real" 1 pt/R$, 3 tiers (multiplicadores 1,0 / 1,2 / 1,5), catálogo com "Escova grátis" (300 pts) e "R$ 20 off" (200 pts), validade 12 meses, teto R$ 800/mês. Publicar sem simular → `loyalty.simulation_required`; simular → estimativas dos últimos 6 meses; publicar → versão ativa (auditada). Saúde: recompensa em dinheiro → `loyalty.cash_reward_in_health`. Outro negócio: "cartão de selos" 10 visitas → 1 serviço.

## 2. Acúmulo

Concluir e pagar atendimento de R$ 170 com tier 1,2 → 204 pontos (arredondado para baixo); evento repetido → sem crédito duplicado. Pacote → pontos na compra, sessões sem pontos. Pagamento no local → pontos só se o negócio permitir.

## 3. Resgate

C08/W11: escolher "R$ 20 off" → pontos reservados; concluir → consumidos e desconto no split como desconto do estabelecimento (comissão pela base da D17); cancelar dentro da política → devolvidos. Resgate no balcão (K02) → consumidor confirma no celular (push ou OTP).

```bash
pnpm test:concurrency --filter loyalty-redeem   # saldo 300, 10 resgates simultâneos de 300 → 1 sucesso; nunca negativo
```

## 4. Estorno, expiração, tiers

Estornar pagamento de pontos já usados → dívida abatida dos próximos créditos; disponível exibido nunca negativo. Pontos a vencer em 30 dias → aviso; vencidos → FIFO. Subida de tier imediata; queda só na revisão anual.

## 5. Teto, painel, abuso

Custo do mês a 80% → aviso; a 100% → catálogo pausado até o mês seguinte. Painel com emitidos, resgatados, expirados, custo, em aberto, ativos e custo/receita incremental com o método. Três pagamentos no local no mesmo dia para o mesmo consumidor → alerta e pontos `pending_review`. Ajuste de 1.500 pontos → step-up e auditoria.

## 6. Modos e encerramento

Trocar para saldo por filial → vale só para pontos novos. Desligar o programa → acúmulo para, resgate por 90 dias. Pontos de um negócio não aparecem em outro (isolamento).
