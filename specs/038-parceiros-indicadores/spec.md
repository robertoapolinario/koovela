# Feature Specification: Parceiros indicadores

**Feature Branch**: `038-parceiros-indicadores`

**Created**: 2026-11-25

**Status**: Clarified

**Input**: User description: "038 parceiros-indicadores — seguir a sequência da constituição (seção 10), fase 3: [D43]. Pendência PEN-30. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: portal do parceiro (`parceiros.koovela.com`, "Portal do parceiro indicador") · back-office ("Parceiros e inventário de destaques", parte de parceiros) · onboarding do tenant (spec 005, campo de indicação)

**Depende de**: 019 `assinatura-koovela-cobranca` · 021 `backoffice-gestao` (e, por elas, a v1.0)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III, IV, V, seções 4.4 (`partners`: "parceiros indicadores, atribuição e pagamento por ativação `[D43]`"), 5 (`parceiros.koovela.com`), 6 (`referral_partner`), 8 (`[PEN-30]`) e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.6, 5.2, 9.11, 17 (`[D43]`) e 18 (`[PEN-30]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Administradoras, franqueadoras, contadores e associações de classe conhecem dezenas de pequenos negócios e podem trazê-los à Koovela em lote (DF 2.6). Hoje não existe forma de saber quem indicou quem, nem de pagar por isso.

A decisão `[D43]` define:

- **parceiros indicadores** com **portal próprio** (`parceiros.koovela.com`);
- remuneração por **valor fixo por tenant ativado**;
- `[PEN-30]`: **o valor** é configurável no back-office; **o critério de "ativado"** foi decidido no clarify de 2026-11-25: **primeira assinatura paga**.

Pela CONST 8, valores ficam configuráveis no back-office, sem número fixo no código; o critério de ativação, porém, muda o que o sistema mede e precisa de decisão.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 2.6 | Trazer tenants em lote | Tenants ativados por parceiros |
| DF 5.2 | Custo de aquisição de tenants | Custo por tenant ativado via parceiro |

Personas: parceiro indicador (pessoa jurídica) e seus usuários; Proprietário do tenant indicado; Comercial/Growth e Fin/Ops da Koovela.

---

## Clarifications

### Session 2026-11-25

- Q: Quando um tenant indicado conta como "ativado" para gerar o pagamento ao parceiro? (PEN-30) → A: Quando paga a primeira fatura da assinatura, em até 90 dias depois da criação do tenant.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar e aprovar um parceiro (Priority: P1)

Como contador, quero me cadastrar como parceiro da Koovela; como Comercial, quero aprovar o parceiro e definir o valor que ele recebe.

**Why this priority**: sem parceiro aprovado, não há indicação.

**Independent Test**: preencher o cadastro de parceiro com CNPJ de teste, aceitar os termos, aprovar no back-office e conferir o acesso ao portal com o link e o código de indicação.

**Acceptance Scenarios**:

1. **Given** o portal do parceiro, **When** uma empresa pede para ser parceira, **Then** informa CNPJ, razão social, tipo (administradora, franqueadora, contador, associação, outro), responsável, contato e dados bancários, e aceita os termos do programa.
2. **Given** o pedido, **When** o Comercial analisa no back-office, **Then** aprova ou recusa com motivo; a aprovação define o valor por tenant ativado (o padrão vigente ou um valor do contrato do parceiro), versionado.
3. **Given** o parceiro aprovado, **When** entra no portal (com segundo fator), **Then** recebe um link e um código de indicação próprios e pode convidar outros usuários da sua empresa.
4. **Given** um parceiro, **When** suspenso pelo Comercial (fraude, quebra dos termos), **Then** novas indicações deixam de ser atribuídas a ele; ativações já conquistadas seguem a regra dos termos.

---

### User Story 2 - Indicar negócios, sozinhos ou em lote (Priority: P1)

Como franqueadora, quero mandar o convite para as 40 unidades de uma vez e ver quem já se cadastrou.

**Why this priority**: indicação em lote é o diferencial do parceiro (DF 2.6).

**Independent Test**: enviar um lote de 5 convites de teste, criar dois tenants pelos links e conferir a atribuição e o funil no portal.

**Acceptance Scenarios**:

1. **Given** o portal, **When** o parceiro compartilha o link ou o código, **Then** quem se cadastrar por ele, ou informar o código no onboarding (spec 005), fica atribuído ao parceiro.
2. **Given** o envio em lote, **When** o parceiro envia uma planilha (nome do negócio, responsável, e-mail ou celular; até 500 linhas), **Then** a Koovela envia um convite em nome do parceiro a cada contato, uma vez só, com opção de não receber mais; o parceiro declara que tem autorização para indicar esses contatos.
3. **Given** a atribuição, **When** o negócio cria o tenant em até 90 dias depois do clique ou do convite, **Then** fica atribuído ao parceiro; vale a primeira atribuição válida.
4. **Given** um negócio que já é tenant da Koovela, ou que tem o mesmo CNPJ ou CPF do próprio parceiro, **When** usa o link, **Then** não é atribuído.
5. **Given** o onboarding de um negócio atribuído, **When** o Proprietário vê o resumo, **Then** aparece "indicado por [parceiro]" e ele pode contestar em até 7 dias, se não conhecer o parceiro; a contestação vai para o Comercial.

---

### User Story 3 - Ativação e pagamento do parceiro (Priority: P1)

Como parceiro, quero ver quais indicados já foram ativados e receber o valor combinado; como Fin/Ops, quero pagar com nota fiscal e sem pagar duas vezes.

**Why this priority**: é a remuneração da `[D43]`.

**Independent Test**: levar um tenant de teste atribuído a cumprir o critério de ativação; conferir o lançamento no extrato do parceiro, o fechamento do mês e o registro de pagamento depois da nota fiscal.

**Acceptance Scenarios**:

1. **Given** um tenant atribuído, **When** cumpre o critério de ativação em até 90 dias depois da criação, **Then** gera um valor fixo a pagar ao parceiro, uma única vez por tenant; ativado = primeira fatura da assinatura paga (REQ-PAR-020).
2. **Given** o fim do mês, **When** o extrato é fechado, **Then** o parceiro vê os tenants ativados no mês e o total a receber, e envia a nota fiscal de serviço pelo portal.
3. **Given** a nota fiscal recebida e conferida, **When** o Fin/Ops aprova, **Then** o pagamento é registrado com data, valor e comprovante; o parceiro vê o extrato como pago.
4. **Given** um tenant ativado que tem a primeira assinatura estornada ou cancelada com reembolso em até 30 dias depois da ativação, **When** isso acontece, **Then** o valor é descontado do próximo extrato do parceiro.
5. **Given** um tenant que não ativa em 90 dias, **When** o prazo vence, **Then** a atribuição continua visível, mas não gera pagamento.

---

### User Story 4 - Acompanhar o funil no portal (Priority: P2)

Como parceiro, quero ver quantos convidei, quantos se cadastraram, quantos ativaram e quanto recebi.

**Why this priority**: mantém o parceiro engajado, mas o pagamento funciona sem o painel completo.

**Independent Test**: com dados sintéticos, abrir o painel do portal e conferir o funil e o extrato.

**Acceptance Scenarios**:

1. **Given** o portal, **When** o parceiro abre o painel, **Then** vê o funil (convidados, cadastrados, ativados, pagos) por mês e a lista de indicados com nome do negócio, data de cadastro, etapa da ativação e prazo restante.
2. **Given** a lista, **When** exibida, **Then** o parceiro não vê dados financeiros, agenda, clientes nem qualquer outro dado do tenant além do nome, da cidade e da etapa da ativação.
3. **Given** o portal, **When** o parceiro abre "materiais", **Then** baixa o material de divulgação aprovado pela Koovela.

---

### Edge Cases

- **Franqueadora com várias unidades no mesmo CNPJ**: um tenant com várias filiais conta uma vez só; unidades com CNPJs próprios contam cada uma.
- **Dois parceiros indicam o mesmo negócio**: vale a primeira atribuição válida; a outra fica registrada sem efeito.
- **Tenant que muda de plano ou é suspenso depois de ativado**: o valor já gerado não é afetado, salvo o estorno da História 3, cenário 4.
- **Parceiro que é também tenant** (por exemplo, um salão que indica outros): pode ser parceiro com outro cadastro, mas não ganha pela própria indicação.
- **Planilha com contatos repetidos ou já convidados**: cada contato recebe no máximo um convite por parceiro em 90 dias.
- **Parceiro sem nota fiscal**: o valor fica retido até a nota; depois de 12 meses sem nota, vence conforme os termos.
- **Mudança do valor padrão**: vale para ativações a partir da data da mudança; ativações anteriores mantêm o valor da época (CONST III).

---

## Requirements *(mandatory)*

Formato: `REQ-PAR-NNN (origem: …)`.

### Functional Requirements

**Parceiro**

- **REQ-PAR-001** (origem: D43 | DF 2.6): Empresas DEVEM poder pedir para ser parceiras pelo portal, com CNPJ, razão social, tipo, responsável, contato e dados bancários, aceitando os termos do programa.
- **REQ-PAR-002** (origem: D43 | CONST 8): O Comercial DEVE aprovar ou recusar com motivo; a aprovação define o valor por tenant ativado (padrão vigente ou valor do contrato), versionado e sem valor fixo no código.
- **REQ-PAR-003** (origem: CONST V | REQ-IDN-020): O acesso ao portal DEVE exigir segundo fator; o parceiro pode convidar usuários da própria empresa.
- **REQ-PAR-004** (origem: D43): Parceiro suspenso NÃO DEVE receber novas atribuições.

**Indicação e atribuição**

- **REQ-PAR-010** (origem: D43): Cada parceiro DEVE ter link e código de indicação; o onboarding (spec 005) DEVE aceitar o código. O link leva o token de indicação na URL até o cadastro, gravado no servidor; cookie de atribuição só com o consentimento de medição do banner da spec 024 (REQ-VIT-053).
- **REQ-PAR-011** (origem: DF 2.6 | CONST IV | CONST 8): O envio em lote DEVE ser só por e-mail na v1 (sem SMS: custo zero), saindo de `news.koovela.com`, aceitar planilha até o limite da `partners_policy` (valor inicial 500 linhas), mandar no máximo um convite por contato por parceiro a cada 90 dias, com opção de não receber mais, e exigir que o parceiro declare ter autorização para indicar os contatos.
- **REQ-PAR-012** (origem: D43): A atribuição DEVE valer para tenant criado em até 90 dias depois do clique ou do convite; vale a primeira atribuição válida.
- **REQ-PAR-013** (origem: D43): NÃO DEVEM ser atribuídos negócios que já são tenants nem negócios com o mesmo CNPJ ou CPF do parceiro ou dos seus usuários.
- **REQ-PAR-014** (origem: CONST V): O Proprietário do tenant DEVE ver "indicado por [parceiro]" e poder contestar em até 7 dias; o Comercial decide, com registro na trilha de auditoria.

**Ativação e pagamento**

- **REQ-PAR-020** (origem: PEN-30 | D43): O tenant atribuído DEVE ser considerado ativado quando pagar a primeira fatura da assinatura (spec 019), em até 90 dias depois da criação do tenant.
- **REQ-PAR-021** (origem: D43 | CONST III): Cada tenant ativado DEVE gerar exatamente um valor a pagar, com o valor vigente na data da ativação, lançado no ledger com chave de idempotência.
- **REQ-PAR-022** (origem: D43): O extrato DEVE ser fechado por mês, com os tenants ativados e o total.
- **REQ-PAR-023** (origem: Lei Complementar 116/2003): O pagamento SÓ DEVE ser aprovado depois de nota fiscal de serviço enviada pelo parceiro e conferida pelo Fin/Ops; o registro do pagamento tem data, valor e comprovante.
- **REQ-PAR-024** (origem: CONST III): Estorno ou reembolso da primeira assinatura em até 30 dias depois da ativação DEVE descontar o valor no próximo extrato.
- **REQ-PAR-025** (origem: D43): Valor sem nota fiscal DEVE ficar retido e vencer depois de 12 meses, conforme os termos.

**Portal e isolamento**

- **REQ-PAR-030** (origem: DF 9.11): O portal DEVE mostrar o funil por mês, a lista de indicados (nome, cidade, data de cadastro, etapa da ativação, prazo restante), o extrato e os materiais de divulgação.
- **REQ-PAR-031** (origem: CONST II | CONST IV): O parceiro NÃO DEVE ver nenhum dado do tenant além de nome, cidade e etapa da ativação.
- **REQ-PAR-032** (origem: CONST 4.4): Parceiros, atribuições e pagamentos DEVEM ficar no domínio `partners`, no espaço global da plataforma, lendo eventos de `tenancy`, `billing`, `payments` e `scheduling`.

**Back-office**

- **REQ-PAR-040** (origem: DF 9.11 | spec 021): O back-office DEVE ter a gestão de parceiros: pedidos, aprovação, valor, suspensão, contestações de atribuição, extratos e pagamentos.
- **REQ-PAR-041** (origem: CONST V): Aprovações, mudanças de valor, decisões de contestação e pagamentos DEVEM gerar registro na trilha de auditoria.
- **REQ-PAR-042** (origem: DF 5.2): O back-office DEVE mostrar, por parceiro e no total, indicados, ativados, taxa de ativação e custo por tenant ativado.

### Key Entities

- **Parceiro** (`referral_partner`): CNPJ, razão social, tipo, responsável, contato, dados bancários (cifrados), estado, valor vigente (versionado).
- **Usuário do parceiro**: pessoa, papel no portal.
- **Convite**: parceiro, contato, data, estado (enviado, descadastrado).
- **Atribuição**: parceiro, tenant, origem (link, código, convite), data, estado (válida, contestada, anulada).
- **Ativação**: atribuição, etapas cumpridas, data de ativação, valor.
- **Extrato**: parceiro, mês, ativações, descontos, total, nota fiscal, pagamento.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| Portal do parceiro | Portal do parceiro indicador | Registrado no plano |
| Back-office | Parceiros e inventário de destaques (parte de parceiros) | Registrado no plano |
| Onboarding do tenant | Campo de código e aviso "indicado por" (spec 005) | Registrado no plano |

O envio em lote, o extrato com nota fiscal e a contestação de atribuição precisam ser conferidos no protótipo.

---

## Regras e estados

- **Parceiro**: `pedido` → `aprovado` | `recusado`; `aprovado` ↔ `suspenso`; `aprovado` → `encerrado`.
- **Atribuição**: `válida` → `contestada` → `válida` | `anulada`.
- **Ativação**: `em_andamento` (até 90 dias) → `ativado` | `vencida`; `ativado` → `estornada` (reembolso em até 30 dias).
- **Extrato**: `aberto` → `fechado` → `aguardando_nota` → `pago`; `aguardando_nota` → `vencido` (12 meses).

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Responsável e usuários do parceiro (nome, contato) | Pessoal | Execução de contrato (art. 7, V) | Enquanto parceiro + 5 anos | Usuários do parceiro; Comercial; Fin/Ops |
| Dados bancários do parceiro | Pessoal ou empresarial; cifrado | Execução de contrato | Enquanto parceiro + 5 anos | Fin/Ops com acesso auditado |
| Contatos da planilha de convite | Pessoal (de terceiros) | Legítimo interesse do parceiro, que é o controlador dos contatos e declara a autorização; a Koovela opera o envio | 90 dias se não virarem tenant; descadastro guardado para não reenviar | Parceiro; Comercial |

O convite informa quem indicou, por que a pessoa recebeu e como não receber mais.

---

## Permissões

| Ação | Usuário do parceiro | Proprietário do tenant | Comercial/Growth | Fin/Ops |
|---|---|---|---|---|
| Pedir cadastro, indicar, ver funil e extrato | ✔ | — | — | — |
| Enviar nota fiscal | ✔ | — | — | — |
| Ver e contestar "indicado por" | — | ✔ | — | — |
| Aprovar, suspender, definir valor, decidir contestação | — | — | ✔ | ✔ (valor) |
| Aprovar e registrar pagamento | — | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `partners.partner.approved.v1` / `.suspended.v1` | Ciclo do parceiro |
| `partners.referral.invited.v1` / `.attributed.v1` / `.disputed.v1` | Indicação e atribuição |
| `partners.activation.achieved.v1` / `.expired.v1` / `.reversed.v1` | Ativação |
| `partners.statement.closed.v1` / `.paid.v1` | Extrato e pagamento |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Tenants ativados via parceiros | DF 2.6 | Acompanhada |
| Taxa de ativação dos indicados | `[D43]` | Acompanhada |
| Custo por tenant ativado via parceiro | DF 5.2 | Acompanhada |
| Contestações de atribuição | Risco | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, um tenant gera no máximo um pagamento a um único parceiro.
- **SC-002**: O parceiro envia um lote de 100 convites em até 3 minutos.
- **SC-003**: 100% dos pagamentos aprovados têm nota fiscal conferida.
- **SC-004**: Nenhum parceiro vê dados do tenant além de nome, cidade e etapa da ativação, verificado por teste.
- **SC-005**: A ativação aparece no portal do parceiro em até 1 hora depois de o tenant cumprir o critério.

---

## Pendências e conflitos

### Bloqueantes

| Item | Pergunta | Decisão (clarify 2026-11-25) |
|---|---|---|
| **PEN-30** (critério) | Qual o critério de "ativado"? | Primeira assinatura paga, em até 90 dias |

O **valor** por tenant ativado (também do `[PEN-30]`) é configurável no back-office (CONST 8) e não bloqueia a spec.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-11** — nível do recebedor e KYC | Spec 012 | "KYC aprovado" segue o nível decidido |
| Planos e cobrança da assinatura | Spec 019 | "Assinatura paga" é a primeira fatura paga |

### Configuráveis (CONST 8)

Os prazos e limites abaixo são valores iniciais da `partners_policy`, versionada no back-office; nenhum fica no código.

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Janela de atribuição | ASSUMIDO: 90 dias depois do clique ou do convite; primeira atribuição válida |
| Prazo de ativação | ASSUMIDO: 90 dias depois da criação do tenant |
| Estorno | ASSUMIDO: reembolso da primeira assinatura em até 30 dias desconta o valor |
| Contestação | ASSUMIDO: até 7 dias pelo Proprietário do tenant |
| Lote | ASSUMIDO: até 500 linhas; um convite por contato por parceiro a cada 90 dias |

---

## Fora do escopo desta especificação

- Comissão recorrente sobre a receita do tenant (a `[D43]` define valor fixo).
- Indicação de consumidores (programa "indique um amigo").
- Indicação de tenant por outro tenant com desconto na assinatura.
- Pagamento automático ao parceiro sem nota fiscal.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: janelas de 90 dias; estorno em 30 dias; contestação em 7 dias; lote de 500 linhas; reflexo da ativação em 1 hora; retenção de 12 meses sem nota.
- O parceiro é sempre pessoa jurídica (CNPJ, inclusive MEI), porque o pagamento exige nota fiscal de serviço.
- O domínio dono é `partners` (CONST 4.4), com o portal em `parceiros.koovela.com` (CONST 5).
