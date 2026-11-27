# Quickstart de validação: Destaque pago na vitrine (032)

Pré-requisitos: specs 001–031 no ar; vitrine (024) com a região "Pinheiros" aberta e listagens sintéticas; negócio de teste participante com assinatura ativa (019, cartão de teste do PSP em sandbox); versão de oferta fictícia do seed local (3 espaços, pacotes de 7 e 30 dias). Contratos em [contracts/](./contracts/), modelo em [data-model.md](./data-model.md).

## 1. Inventário e preços (back-office)

Comercial/Growth propõe 3 espaços para "manicure, Pinheiros" com pacotes 7/30 dias → fica `proposed`; Fin/Ops aprova → vigente. Sem versão vigente numa categoria → "Destaque na vitrine" não oferece aquela combinação. Mudar preço → destaques já comprados mantêm `price_cents_paid`.

## 2. Compra

Painel → "Destaque na vitrine" → 7 dias, manicure, Pinheiros, início na semana seguinte → reautenticação 2FA → cobrança no cartão, estado `reserved`, nota da Koovela emitida, ocupação +1 nos 7 dias. Cronometrar: ≤ 2 min (SC-004). Com Pix: QR com 15 min; deixar expirar → inventário liberado.

Inelegível (fatura em atraso, fora da vitrine, perfil incompleto) → motivo exibido, sem botão de compra.

```bash
pnpm test:concurrency --filter sponsored   # 20 compras paralelas pelo último espaço → exatamente 1 aceita (SC-003)
```

## 3. Faixa na vitrine

No dia de início (`workers` avança `reserved` → `active`), buscar "manicure" em Pinheiros (app e web): faixa separada com selo "Patrocinado" em cada item; tocar no selo → explicação. O negócio também aparece na posição orgânica. Filtro "disponível hoje" → só destaques que atendem. Busca em outro bairro → sem faixa. Negócio de saúde em destaque → item sem preço e sem nota. 5 destaques e 3 visíveis → cada um aparece em ~60% das exibições.

```bash
pnpm test:organic-invariance --filter discovery   # results idênticos com e sem destaques (SC-001)
pnpm test:contract --filter sponsored             # 100% dos itens com sponsored=true; nenhum preço em saúde (SC-002)
pnpm lint:boundaries                              # search/ranking não importam sponsored
pnpm test:a11y --filter sponsored-band            # axe AA
```

## 4. Resultado

Gerar exibições, toques e um agendamento iniciado pela faixa na mesma sessão (e outro em sessão nova, que **não** conta). "Destaque na vitrine" → destaque → tabela diária com exibições, toques, visitas, agendamentos de origem destaque e receita, em ≤ 2 toques (SC-005); nenhum dado de consumidor. Destaque encerrado → "Renovar" mostra disponibilidade a partir do dia seguinte ao fim.

## 5. Pausas, cancelamentos e reembolsos

- Cancelar ≥ 48 h antes → estorno integral e inventário liberado; < 48 h → `sponsored.cancel_window_closed`.
- Pausar a participação ou suspender a assinatura → `paused`, sem extensão; voltar → `active`.
- Fechar a região → `partially_refunded` com estorno proporcional aos dias restantes.
- Denúncia → retirada → `paused` (moderation); improcedente → fim estendido (ou crédito se não houver inventário).
- Conferir na trilha de auditoria (004) compra, cancelamento, reembolsos e mudanças de oferta.
