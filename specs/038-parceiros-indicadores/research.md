# Research: Parceiros indicadores (038)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas:

- **D36**: fase 3.
- **D43**: parceiros indicadores com portal próprio e valor fixo por tenant ativado.
- **PEN-30**: o valor é configurável no back-office; ativado = primeira fatura da assinatura paga em até 90 dias depois da criação do tenant.
- **PEN-11**: nível do recebedor.

Base: 002 (tenants e documentos), 003 (identidade, segundo fator, tipos de conta), 004 (auditoria, aprovação dupla, flags), 005 (onboarding e titular do negócio), 011 (envio de e-mail e SMS, descadastro por link assinado), 017 (validação de NFS-e), 019 (faturas, estornos e créditos), 021 (back-office), 022 (retenção), 023 (BI), 032 (tela compartilhada "Parceiros e inventário de destaques").

Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e superfícies

- **Decisão**: o domínio `partners` (CONST 4.4) fica no schema global `koovela_platform` (REQ-PAR-032) e lê eventos de `tenancy` (002/005), `billing` (019) e `identity` (003).
  - **Portal**: `apps/partner-web` em `parceiros.koovela.com`, em React Router 7, com os mesmos tokens e i18n.
  - **Back-office**: no `admin-web`, na seção "Parceiros", compartilhada com o inventário de destaques da 032.
  - **Onboarding**: campo de código e aviso "indicado por" na 005.

## R2. Identidade dos usuários do parceiro

- **Decisão**: o `kind` da 003 ganha o valor `partner` (aditivo). Um usuário do parceiro é uma pessoa da `identity` com vínculo `partners_member (partner_id, person_id, role)`. Os papéis são `admin`, que convida usuários e envia nota, e `member`, que indica e vê o funil.
  - O segundo fator é obrigatório desde o primeiro acesso, por TOTP ou WebAuthn (REQ-PAR-003).
  - As sessões são separadas das de consumidor e de equipe.
  - Uma pessoa que também é Proprietário de tenant usa a mesma identidade com outro `kind`. Ela não ganha pela própria indicação (R5).

## R3. Cadastro, aprovação e valor (PEN-30)

- **Decisão**: o parceiro passa por `requested` → `approved` ou `rejected`; `approved` ↔ `suspended`; `approved` → `closed` (REQ-PAR-001/002/004).
  - O cadastro pede CNPJ, com dígito validado e MEI aceito; razão social; tipo; responsável; contato; dados bancários **cifrados por envelope**; e o aceite da versão dos termos do programa.
  - **Valor por tenant ativado**:
    - `partners_rate_default_version` é o padrão global, versionado e sem número no código. Sem versão vigente, ninguém é aprovado.
    - Na aprovação, o Comercial escolhe o padrão ou um valor do contrato (`partners_rate_version` do parceiro).
    - Mudanças de valor precisam de aprovação do Fin/Ops (aprovação dupla da 004).
    - A ativação congela o valor vigente na sua data (CONST III).
  - **Suspensão**: o parceiro deixa de receber atribuições novas. As ativações já conquistadas seguem os termos.

## R4. Link, código e convites em lote

- **Decisão**:
  - **Código**: de 8 caracteres, sem caracteres ambíguos. **Link**: `koovela.com/p/{code}`.
    - A página do link grava um cookie de primeira parte `kv_ref`: token assinado com `(partner_id, source, touched_at)`, válido por 90 dias.
    - O onboarding (005) lê o cookie e aceita o código digitado (REQ-PAR-010).
  - **Lote** (REQ-PAR-011, SC-002):
    - planilha CSV ou XLSX de até 500 linhas, com nome do negócio, responsável e e-mail ou celular;
    - validação e prévia antes do envio;
    - declaração obrigatória de autorização, versionada;
    - processamento no `workers` pela 011, com o lote de 100 em até 3 minutos.
  - **Canais**: e-mail sempre que existir. SMS só para linhas sem e-mail, dentro de uma cota diária configurável (`sms_daily_cap`), porque SMS tem custo.
  - **Conteúdo do convite**: quem indicou, por que a pessoa recebeu, link com o token do convite e descadastro em um clique (link assinado da 011).
  - **Regras de envio**:
    - no máximo um convite por contato por parceiro a cada 90 dias;
    - repetidos na planilha são descartados;
    - lista de supressão global de convites de parceiros (`partners_invite_suppression`) por HMAC do contato normalizado, que vale para qualquer parceiro.
  - **Retenção dos contatos**: 90 dias se não virarem tenant. Depois, sobra só o HMAC da supressão.

## R5. Atribuição

- **Decisão**: na criação do tenant (evento da 002/005), o `partners` reúne os toques válidos: cookie, código digitado e token de convite (REQ-PAR-012/013).
  - **Toque válido**:
    - dentro de 90 dias;
    - parceiro `approved` no momento do toque e da criação;
    - documento do negócio que ainda não é tenant (consulta por HMAC do documento na 002);
    - documento diferente do CNPJ do parceiro e dos CPFs dos usuários do parceiro, comparados por HMAC.
  - Vale o **toque válido mais antigo**. Os demais ficam registrados como `superseded`, sem efeito.
  - A atribuição é UNIQUE por `tenant_id` (SC-001).
  - **Várias unidades**: um tenant com várias filiais conta uma vez. Unidades com CNPJ próprio, que são tenants distintos, contam cada uma.

## R6. Contestação pelo Proprietário

- **Decisão**: o resumo do onboarding e as configurações do negócio mostram "indicado por {razão social}", com o botão "não conheço este parceiro" por 7 dias depois da criação (REQ-PAR-014).
  - A contestação muda a atribuição para `disputed` e abre uma fila para o Comercial.
  - O Comercial decide `valid` ou `voided`, com motivo e auditoria.
  - Uma atribuição anulada não gera ativação. Se a ativação já aconteceu, gera estorno no próximo extrato.

## R7. Ativação

- **Decisão**: o `partners` consome `billing.invoice.changed` (019) (REQ-PAR-020/021, SC-005).
  - **Condições**: a fatura é a primeira fatura de ciclo paga (`kind = cycle`, estado `paid`, valor > 0) do tenant atribuído, e `paid_at ≤ created_at + 90 dias`.
  - **Resultado**: ativação `achieved` com o valor congelado e lançamento no livro do parceiro.
  - **Idempotência**: `UNIQUE(tenant_id)` na ativação e chave `activation:{tenant_id}` no lançamento.
  - Faturas avulsas (por exemplo, destaque da 032) e degustação sem cobrança não contam.
  - **Vencimento**: uma tarefa diária marca `expired` 90 dias depois da criação sem pagamento. A atribuição continua visível.
  - A latência baixa, porque é dirigida por evento, cumpre a meta de 1 hora.

## R8. Estorno

- **Decisão**: um estorno, reembolso ou crédito integral da primeira fatura (019) em até 30 dias depois da ativação leva a ativação a `reversed` (REQ-PAR-024).
  - Gera um lançamento negativo no extrato aberto seguinte.
  - Se o extrato ficar negativo, o saldo passa para o mês seguinte. Não há cobrança ativa do parceiro.

## R9. Livro, extrato, nota e pagamento

- **Decisão**:
  - **Livro**: `partners_ledger_entry` de dupla entrada no `koovela_platform`, com contas `partner_acquisition_expense` (despesa de aquisição), `partner_payable` (a pagar) e `cash_bank` (banco). Soma zero por lançamento e idempotência por chave (CONST III).
  - **Extrato mensal** (REQ-PAR-022): fechado no 1º dia útil, com ativações, estornos e total.
    - Estados: `open` → `closed` → `awaiting_invoice` → `paid`; `awaiting_invoice` → `expired` em 12 meses (REQ-PAR-025).
  - **Nota fiscal** (REQ-PAR-023, SC-003): o admin do parceiro envia o XML da NFS-e (padrão nacional) e o PDF.
    - Validação automática: CNPJ do prestador igual ao do parceiro, tomador Koovela, valor igual ao total do extrato e nota não cancelada, usando o leitor de XML da 017.
    - Depois, conferência e aprovação pelo Fin/Ops.
  - **Pagamento**: transferência feita pelo Fin/Ops fora da plataforma. O registro guarda data, valor, comprovante (arquivo) e autor. O lançamento `partner_payable` → `cash_bank` muda o extrato para `paid`.
  - **Sem pagamento automático**: não há pagamento sem nota.

## R10. Portal: o que o parceiro vê

- **Decisão**: a projeção `partners_referral_view` tem **só** estes campos: nome do negócio, cidade, data de cadastro, etapa da ativação e prazo restante (REQ-PAR-030/031, SC-004).
  - O portal lê só essa projeção, o funil mensal (convidados, cadastrados, ativados e pagos), os extratos e os materiais.
  - Não há nenhuma chamada a domínios de tenant.
  - Um teste de contrato garante que nenhuma resposta do portal tem campos fora dessa lista.
  - **Materiais**: arquivos aprovados pelo Comercial no Object Storage, baixados por URL assinada.

## R11. Back-office e métricas

- **Decisão**: a seção "Parceiros" do `admin-web` tem pedidos, aprovação, valor, suspensão, fila de contestações, extratos, conferência de nota e registro de pagamento, tudo auditado (REQ-PAR-040/041).
  - Por parceiro e no total: indicados, ativados, taxa de ativação e custo por tenant ativado (soma paga ÷ ativados) (REQ-PAR-042).
  - Os eventos vão para o BI (023), e o custo entra no CAC do canal "parceiros".

## R12. Dados pessoais

- **Decisão**:
  - Responsável e usuários: guardados enquanto a parceria existir e por mais 5 anos.
  - Dados bancários: cifrados, com acesso do Fin/Ops auditado.
  - Contatos de convite: o parceiro é o controlador e declara a autorização; a Koovela é operadora do envio. Ficam 90 dias, e depois só o HMAC de supressão.
  - O `HolderDataPort` (022) cobre os usuários do parceiro.

## R13. Telas

| Superfície | Tela | Código |
|---|---|---|
| Portal do parceiro | Cadastro · Início (link, código) · Convidar em lote · Indicados e funil · Extratos e nota · Materiais · Usuários | "Portal do parceiro indicador" (DF 9.11); lote, nota e extrato a conferir |
| Back-office | Parceiros (parte da tela compartilhada com a 032) | DF 9.11 |
| Onboarding do tenant | Campo de código · aviso "indicado por" e contestação | Extensão da 005; contestação a conferir |
