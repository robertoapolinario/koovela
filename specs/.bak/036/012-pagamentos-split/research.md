# Research: Pagamentos e split (012)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões do clarify aplicadas: PEN-09 (taxa por agendamento no split + fatura), PEN-11 (recebedor por negócio), PEN-13 (forma da multa escolhida pelo estabelecimento), PEN-14 (comissão via split para todos, PJ e CLT), PEN-06 (taxa de agendamento fixa em saúde). Base: 006 (pacote), 007 (contrato de comissão), 009 (estados), 010 (eventos de multa). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: domínio `payments` (CONST 4.4). Pagamentos, splits, estornos, chargebacks, livros-razão e conciliação no schema do tenant (REQ-PAG-080). Cartões salvos e consentimentos em `koovela_identity` (tabelas do `payments`), ligados ao consumidor global. Configuração de taxas da Koovela em `koovela_platform`, versionada (REQ-PAG-044).

## R2. Provedor (PSP) atrás de `PaymentProvider`

- **Decisão**: interface `PaymentProvider` em `packages/platform/payments` (REQ-PAG-001) com as operações:
  - cobrar Pix e cartão;
  - tokenizar;
  - split;
  - recebedores e KYC (negócio **e colaboradores**, PEN-14);
  - estorno total e parcial;
  - chargeback;
  - extrato;
  - repasse.
  
  O adaptador inicial é escolhido entre PSPs nacionais com split e subcontas de recebedor (critérios do REQ-PAG-002, custo por transação e prazo de liquidação), por cotação na implementação. Em dev e CI, adaptador **sandbox** do PSP e um adaptador `fake` determinístico para testes de propriedade e concorrência.
- **Por quê**: D07 e CONST III; o PSP é uma decisão comercial que não deve mudar o domínio.
- **Pendência não bloqueante**: escolher o PSP (precisa aceitar recebedor pessoa física para colaborador CLT, consequência do PEN-14).

## R3. Cartão sem tocar nos servidores

- **Decisão**: tokenização no cliente pelo SDK/JS do PSP (iframe ou campos hospedados na web; SDK nativo no app); a API da Koovela só recebe o token (REQ-PAG-003). CSP do `consumer-web` permite apenas o domínio do PSP. Cartões salvos: só token, bandeira, final e validade, com consentimentos separados (compra e multa no cartão salvo, REQ-PAG-024). Limite de recusas por consumidor, aparelho e IP (5/h) com bloqueio e evento para a 021 (REQ-PAG-025).

## R4. Idempotência e webhooks

- **Decisão**: toda operação financeira com `Idempotency-Key` (tabela `payments_idempotency` com resultado guardado, REQ-PAG-004). Webhooks do PSP verificados por assinatura e deduplicados por `psp_event_id` (UNIQUE) em `payments_psp_event`; processamento no `workers` pelo padrão outbox. Pagamento aprovado → `payments.payment.approved.v1` → 009 confirma em ≤ 10 s p95 (REQ-PAG-022). Pagamento após a expiração do agendamento → estorno automático em ≤ 1 dia útil com aviso (REQ-PAG-023).

## R5. Split determinístico

- **Decisão**: função pura `computeSplit` (`packages/domain/split`):
  1. líquido = pago − taxa do PSP;
  2. partes da Koovela: take rate em pontos-base sobre o bruto, taxa por agendamento (só quando o pagamento passa pela Koovela, PEN-09) e taxa de horário ocioso (014), com as versões da configuração;
  3. comissão do colaborador pelo contrato da 007, com a versão congelada no agendamento (PEN-14);
  4. cada parte arredondada para baixo ao centavo; o **resto vai para o estabelecimento** (REQ-PAG-040).
- Se Koovela + comissão passarem do líquido, o split falha fechado (sem cobrar) e alerta o Financeiro/Ops, para nunca gerar parte negativa.
- **Colaborador sem recebedor verificado**: a comissão vai para o recebedor do negócio, marcada como `pending_professional`, e é transferida quando ele for verificado (REQ-PAG-043).
- **Saúde**: o split da taxa de agendamento tem só a Koovela e o estabelecimento. A comissão do atendimento é calculada no pagamento no local do restante e repassada no fechamento (018) (REQ-PAG-046).
- **Teste de propriedade** (portão, REQ-PAG-045): soma das partes = líquido e nenhuma parte negativa, para qualquer combinação de partes, descontos, taxas e estornos.

## R6. Livros-razão

- **Decisão**: dois livros, ambos imutáveis (REQ-PAG-055):
  - **financeiro de dupla entrada** (`payments_journal` + `payments_posting`, soma das partidas = 0 por lançamento) para cobrança, split, estorno, chargeback e repasse;
  - **de saldos em unidades** (`payments_balance_account` + `payments_balance_entry`) para sessões de pacote na v1.0 (vale-presente e créditos de aula depois).
- O saldo materializado na conta é atualizado **na mesma transação** do lançamento, com a conta travada `FOR UPDATE` e `CHECK (balance ≥ 0)`. Não existe `UPDATE saldo` fora de um lançamento, o que atende a CONST III.
- Contratos `reserve`, `consume` e `release` de sessão para a 009 (REQ-PAG-062).
- **Testes**: concorrência (N reservas simultâneas com saldo 1 → 1 sucesso) e reprocessamento.

## R7. Multas, devoluções e estornos

- **Decisão**: consumidor de `scheduling.policy_fee.*` (010) executa a forma congelada:
  - `retain_deposit`: a multa fica com as partes do split e o resto do sinal volta;
  - `retain_deposit_and_charge_card`: cobra a diferença no cartão salvo, só com o consentimento de multa;
  - `record_only`: só registro.
  
  Reversões, abonos e contestações aceitas devolvem pelo mesmo meio, desfazendo o split na mesma proporção (REQ-PAG-050/051). Estorno manual pelo Proprietário ou pelo Financeiro/Ops com motivo, step-up e auditoria, nunca acima do estornável (REQ-PAG-052). Estorno de valor já repassado vira débito nos próximos repasses do recebedor (REQ-PAG-053).

## R8. Chargeback

- **Decisão**: `payments_chargeback` com prazo e pacote de provas montado automaticamente (check-in/out da 009, aceite da política da 010, entregas da 011), aviso ao Proprietário e ao Financeiro/Ops; defesa no back-office (021) (REQ-PAG-054).

## R9. Pagamento no local e restante

- **Decisão**: registro pela equipe (dinheiro, maquininha própria, Pix direto, outro) sem PSP nem split, mas com lançamento no livro financeiro (conta "fora da plataforma") para comissão, financeiro e North Star (REQ-PAG-030). Anulação pela equipe em 24 h e depois só pelo Proprietário, auditada (REQ-PAG-031). Restante após o sinal e diferença do "a partir de": pedido de pagamento pelo app, com link enviado pela 011 (REQ-PAG-026).

## R10. Conciliação diária

- **Decisão**: tarefa diária no `workers` compara transações, taxas, estornos, chargebacks e repasses com o extrato do PSP; divergências em `payments_reconciliation_issue` com alerta ao Financeiro/Ops e ao SRE, encerradas só com justificativa (REQ-PAG-072). Fila de divergências no back-office (tela nova).

## R11. Recebedores

- **Decisão**: recebedor do negócio (titular PF/PJ da 005, conta bancária cifrada, documentos pedidos pelo PSP) com estados `under_review` → `active` \| `rejected` \| `blocked`; troca de conta com step-up, nova verificação, auditoria e aviso (REQ-PAG-012). **Recebedor do colaborador** (PEN-14): cadastro pelo próprio colaborador no app (CPF, conta e documentos), com o mesmo ciclo; estado visível na 007. O modelo aceita `level = branch` (PEN-11, futuro).

## R12. Telas (Figma)

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Meio de pagamento · Checkout e sinal (Pix) | C10 · C11 |
| Web do consumidor | Meio de pagamento e checkout Pix | W13 |
| Painel | Recebedor, KYC e NFS-e (onboarding) · Financeiro: recebimentos e split | O05 · P21 |
| Colaborador | Registro de pagamento no check-out | K02 · KD2 |
| Back-office | Antifraude, estornos e chargebacks (registro) | G08 |
| Novas | Saldo de sessões do consumidor · fila de divergências · cadastro de recebedor do colaborador | Desenhar no protótipo |
