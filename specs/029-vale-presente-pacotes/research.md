# Research: Vale-presente e pacotes (029)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D33 (vale-presente por valor ou por serviço, combo ou pacote; só na filial da compra), PEN-24 (**NFS-e no uso**, pelo valor do serviço coberto; venda como adiantamento; validar com contador), D17 (base da comissão). Base: 003 (etapa 1 do cadastro), 006 (pacotes), 009 (resumo e estados), 010 (política), 011 (entrega), 012 (livro de saldos, Pix/cartão, split, estorno), 015 (pontos e confirmação no celular), 017 (emissão), 019 (suspensão), 022 (`HolderDataPort`), 028 (oferta de campanha). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `gift_cards` do domínio `payments` (o saldo é dinheiro/direito pré-pago e vive no livro de saldos da 012), schema do tenant (REQ-VAL-060). A **carteira** do consumidor (vales de vários estabelecimentos) é projeção global em `koovela_projections.consumer_wallet`, alimentada por eventos, como "Meus agendamentos".

## R2. Vale e código

- **Decisão**: `gift_card` com comprador, destinatário (nome e, opcional, celular ou e-mail), filial, tipo (`amount` \| `service` \| `combo` \| `package`), valor pago, saldo, mensagem, arte, código, entrega, validade, estado (REQ-VAL-001). Código de 16 caracteres Crockford Base32 com 80 bits aleatórios (CSPRNG) e dígito de verificação; guardado só como hash (HMAC) e exibido mascarado depois da entrega (REQ-VAL-005). Tentativas erradas limitadas a 5/h por conta e aparelho (Redis), com alerta à 021 em excesso. Preço de serviço, combo ou pacote congelado no vale (versão do catálogo) (REQ-VAL-004).

## R3. Compra e entrega

- **Decisão**: compra por qualquer pessoa com etapa 1 do cadastro, Pix ou cartão pela 012, com split para a filial (REQ-VAL-002). Na venda, o split retém só a taxa do PSP e o take rate vigentes na 012; a taxa por agendamento da Koovela é cobrada no uso, porque é por agendamento. Entrega por aviso (011) na hora ou na data, ou só código para entregar pessoalmente (REQ-VAL-003). Reenvio a outro destinatário uma única vez antes do resgate (REQ-VAL-016).

## R4. Saldo e uso

- **Decisão**: conta no livro de saldos da 012: `product_kind = gift_card_amount` (centavos) ou `gift_card_item` (unidade de serviço/combo); lançamentos `credit` (compra), `reserve`, `consume`, `release`, `expire`, `refund`, `adjust`; nunca negativo (REQ-VAL-012). Uso no resumo do agendamento (009): reserva na confirmação, consumo na conclusão, devolução no cancelamento dentro da política (REQ-VAL-013). Só na filial da compra (REQ-VAL-011). Vale de valor admite uso parcial. Vale de pacote, ao ser resgatado, vira um pacote do presenteado com as regras da 006 (REQ-VAL-014). Balcão: confirmação no celular do presenteado (mesmo mecanismo da 015) (REQ-VAL-015). Estorno de agendamento pago com vale devolve ao saldo, nunca em dinheiro (REQ-VAL-053).

## R5. Ordem de abatimento e combinações

- **Decisão**: oferta de campanha → resgate de fidelidade → vale-presente → pagamento (Regras da spec). A oferta de campanha e o resgate de fidelidade continuam **mutuamente exclusivos** (REQ-CRM-027); o vale combina com qualquer um deles (REQ-VAL-052). Função pura `applyDeductions` em `packages/domain/pricing` com teste de propriedade (nenhum valor negativo; soma = preço).

## R6. Reembolso, validade e encerramento

- **Decisão**: vale sem nenhum uso → reembolso integral ao comprador pelo mesmo meio em até 7 dias da compra (CDC art. 49) (REQ-VAL-020); fora disso só por decisão do estabelecimento, auditado (REQ-VAL-021). Validade por filial (padrão 12 meses, mínimo 6), avisos 30 e 7 dias antes (REQ-VAL-022). Suspensão do tenant (019) estende a validade pelo tempo suspenso; encerramento da filial oferece a filial mais próxima do negócio ou o reembolso do saldo (REQ-VAL-023).

## R7. Nota fiscal (PEN-24)

- **Decisão**: a venda do vale é registrada como **adiantamento** no livro financeiro (sem NFS-e); a NFS-e sai **no uso**, pelo valor do serviço coberto, com a configuração de emitente da 017 (REQ-VAL-030). Reembolso de vale cuja nota foi emitida na venda (casos antigos ou configuração anterior) segue o cancelamento da 017 (REQ-VAL-031).
- **Conflito com a 017**: a REQ-FIS-013 tem "na venda" como padrão para pacotes. A decisão de 2026-11-25 (PEN-24) diz "no uso" para vale **e pacote**. Resolvido em 2026-11-27: a 017 passou a ter `per_session` como padrão para pacotes e emite o vale no uso (`source_kind = gift_card_use`). Validar com contador.

## R8. Comissão e pontos

- **Decisão**: comissão no uso, sobre o valor do serviço coberto, pela base da D17 (007) (REQ-VAL-050). Comprador não ganha pontos; presenteado ganha no uso sobre o valor coberto (015) (REQ-VAL-051).

## R9. Configuração e painel

- **Decisão**: por filial: ligar/desligar, faixa ou valores fixos, serviços/combos/pacotes presenteáveis, artes (do catálogo da Koovela + upload do negócio), validade (REQ-VAL-040). Painel com lista e totais do mês (vendido, usado, a vencer, vencido, reembolsado) (REQ-VAL-041). Recepção vende no balcão e aplica no check-out (REQ-VAL-042).

## R10. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Comprar vale-presente | A conferir (DF 9.10) |
| Web do consumidor | Vale-presente | A conferir |
| Painel | Vale-presente e pacotes vendidos | A conferir |
| A conferir/novas | Página de resgate · carteira de vales · uso no balcão | Desenhar se não existirem |
