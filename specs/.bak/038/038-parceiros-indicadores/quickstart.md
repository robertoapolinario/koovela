# Quickstart de validação: Parceiros indicadores (038)

Pré-requisitos:

- Specs 001 a 037 no ar.
- Valor padrão de teste aprovado (seed local).
- E-mail de teste (011) em modo captura.
- Assinatura (019) com PSP em sandbox.
- XML de NFS-e de exemplo do padrão nacional.

Os contratos estão em [contracts/](./contracts/) e o modelo em [data-model.md](./data-model.md).

## 1. Cadastro e aprovação

1. Peça para ser parceiro com um CNPJ de teste e aceite os termos. Esperado: `requested`.
2. O Comercial aprova com o valor padrão. Esperado: o portal exige o segundo fator no primeiro acesso e mostra link e código.
3. Proponha um valor de contrato. Esperado: só vale depois da aprovação do Fin/Ops.
4. Suspenda o parceiro. Esperado: novos toques não atribuem.

## 2. Indicação

1. Envie uma planilha com 105 linhas, incluindo repetidos e um contato suprimido. Esperado: a prévia lista os descartados por motivo.
2. Declare a autorização e envie. Esperado: 100 convites em até 3 minutos (SC-002), com remetente, motivo e descadastro.
3. Reenvie para os mesmos contatos dentro de 90 dias. Esperado: `cooldown_90d`.
4. Crie um tenant pelo link (cookie) e outro informando o código no onboarding. Esperado: os dois atribuídos.
5. Toque no link de outro parceiro antes de criar o tenant. Esperado: vale o toque mais antigo; o outro fica `superseded`.
6. Crie um tenant com o CNPJ do parceiro ou o CPF de um usuário dele. Esperado: sem atribuição.
7. Crie um tenant para um documento que já é tenant. Esperado: sem atribuição.
8. Proprietário de um tenant atribuído contesta em até 7 dias. Esperado: `disputed`. O Comercial decide `voided`.

```bash
pnpm test:property --filter partners-attribution   # 1 tenant → no máximo 1 parceiro, 1 ativação, 1 pagamento (SC-001)
```

## 3. Ativação e pagamento

1. Pague a primeira fatura de ciclo no dia 20. Esperado: ativação `achieved` com o valor congelado, visível no portal em até 1 h (SC-005).
2. Uma fatura avulsa (032) não ativa.
3. Um tenant sem pagamento em 90 dias fica `expired`.
4. Reembolse a primeira fatura em até 30 dias. Esperado: `reversed` e desconto no próximo extrato.
5. Feche o mês. Esperado: extrato `closed` → `awaiting_invoice`.
6. Envie o XML com valor divergente. Esperado: `auto_check` falha. Envie o XML correto. Esperado: o Fin/Ops aprova e registra o pagamento com comprovante, e o extrato fica `paid`.
7. Tente registrar o pagamento sem nota aprovada. Esperado: `partners.invoice_not_approved` (SC-003).
8. Avance o relógio 12 meses sem nota. Esperado: `expired`.

```bash
pnpm test:property --filter partners-ledger   # cada lançamento soma zero; idempotência das chaves
```

## 4. Portal e isolamento

```bash
pnpm test:contract --filter partner-portal   # respostas só com nome, cidade, cadastro, etapa e prazo (SC-004)
```

No back-office, confira por parceiro e no total: indicados, ativados, taxa de ativação e custo por tenant ativado. Aprovações, valores, contestações e pagamentos ficam na trilha de auditoria.
