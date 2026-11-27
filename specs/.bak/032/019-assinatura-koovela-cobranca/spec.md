# Feature Specification: Assinatura Koovela e cobrança do tenant

**Feature Branch**: `019-assinatura-koovela-cobranca`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "019 assinatura-koovela-cobranca — seguir a sequência da constituição (seção 10): planos, taxa por agendamento, inadimplência, suspensão. Depende de 012. Pendências PEN-08 e PEN-09. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para excedente de envios do CRM `[D32]` e pacotes de destaque `[D37]`)

**Superfícies afetadas**: painel do cliente ("Assinatura Koovela e faturas"; escolha de plano no onboarding; avisos de pendência) · back-office ("Planos, cobrança e inadimplência") · todas as superfícies do tenant (efeito da suspensão)

**Depende de**: 012 `pagamentos-split` (e, por ela, 002 a 011); usa a emissão fiscal da 017 para a nota da própria Koovela

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, III, V, VII, IX, seções 4.4 (`billing`), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.4, 2.5, 3.4.3, 3.4.7, 5.1, 5.2, 5.3, 7, 9.3, 9.5, 11.6, 14, 17 (`[D13]`) e 18 (`[PEN-08]`, `[PEN-09]`, `[PEN-30]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A Koovela ganha dinheiro com **assinatura mensal e taxa por agendamento**, cobradas desde o primeiro cliente `[D13]`. Isso exige, já na v1.0, cobrança recorrente, emissão de fatura, régua de inadimplência e suspensão por falta de pagamento (DF 5.1). Para a Gestão, é o problema "cobrar assinatura e tratar inadimplência" (DF 3.4.7).

Três pontos ainda estão abertos:

- **valores** da assinatura, **faixas** por porte (número de colaboradores e de filiais), **política para o autônomo**, e se a taxa incide sobre **todo agendamento** ou só sobre o **pago na plataforma** (`[PEN-08]`);
- se a taxa por agendamento é **retida no split** da transação ou **cobrada na fatura** (`[PEN-09]`, mesma pergunta da spec 012).

Pela constituição, nenhum desses valores fica fixo no código: tudo é configurável no back-office (CONST 8). A suspensão usa o ciclo de vida do tenant da spec 002, sem tocar diretamente no banco.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.4.7 | Cobrar assinatura e tratar inadimplência | Inadimplência; recuperação |
| 3.4.3 | Conceder desconto e degustação | Conversão da degustação (com a spec 021) |
| DF 14 | Monetização e retenção | ARPA; churn de tenant; NRR; margem por tenant |

Personas: Proprietário (escolhe plano, paga, vê faturas); Financeiro/Ops (cobrança, inadimplência); Comercial/Growth (planos, degustação, pela spec 021); SRE (suspensão, pela spec 002).

---

## Clarifications

### Session 2026-11-25

- Q: Funções por plano e base da taxa ficam fixas? → A: Não: como o PEN-08 ficou todo configurável, funções por plano e base da taxa também são definidas no back-office; valores iniciais: todas as funções em todos os planos e taxa só sobre agendamentos concluídos e pagos.
- Q: Quais são os valores, as faixas e a política para o autônomo? (PEN-08) → A: Tudo configurável no back-office (valores, faixas por porte, política do autônomo e base da taxa), sem plano gratuito pré-definido e sem valor fixo no código.
- Q: A taxa por agendamento é retida no split ou cobrada na fatura? (PEN-09) → A: Retida no split quando o pagamento passa pela Koovela; somada na fatura quando o pagamento é no local.
- Q: Quem paga o SMS transacional? → A: O tenant: cota mensal no plano e excedente na fatura.
- Q: E o WhatsApp transacional? (análise da 011, 2026-11-26) → A: Igual ao SMS: cota mensal no plano e excedente na fatura. O SMS de OTP é custo da Koovela, não entra na fatura.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escolher o plano e cadastrar o pagamento (Priority: P1)

Como Proprietário, quero ver os planos, entender o que cada um inclui e quanto vou pagar (assinatura e taxas), escolher um e cadastrar a forma de pagamento.

**Why this priority**: sem plano escolhido e forma de pagamento não há receita recorrente `[D13]`.

**Independent Test**: num tenant de teste, abrir a escolha de plano, comparar planos, escolher um, cadastrar um cartão de teste e conferir a assinatura ativa e a primeira fatura prevista.

**Acceptance Scenarios**:

1. **Given** a escolha de plano (no onboarding ou em "Assinatura Koovela e faturas"), **When** o Proprietário abre, **Then** vê os planos com preço mensal, faixas de colaboradores e filiais incluídas, valor da taxa por agendamento e sobre quais agendamentos ela incide, conforme a configuração vigente no back-office (`[PEN-08]` resolvido: tudo configurável, sem plano gratuito pré-definido); cada plano mostra também as cotas mensais de SMS e de WhatsApp transacionais e o preço de cada excedente.
2. **Given** um plano escolhido, **When** o Proprietário cadastra a forma de pagamento (cartão de crédito recorrente ou Pix por fatura), **Then** a assinatura fica `ativa` (ou `em_degustação`, se houver concessão da spec 021) e a data do próximo vencimento aparece.
3. **Given** um exemplo de custo, **When** o Proprietário compara planos, **Then** vê uma simulação com o número de agendamentos do último mês (ou um número informado): assinatura + taxas estimadas.
4. **Given** o caminho autônomo (spec 005), **When** chega à escolha de plano, **Then** vê o plano do autônomo conforme a política definida no `[PEN-08]`.
5. **Given** a troca de cartão, **When** feita, **Then** exige reautenticação com segundo fator (REQ-IDN-022) e gera registro na trilha de auditoria.

---

### User Story 2 - Fatura mensal clara e paga sem esforço (Priority: P1)

Como Proprietário, quero receber todo mês uma fatura com a assinatura, as taxas por agendamento e qualquer outro valor, paga automaticamente ou por Pix, com a nota fiscal da Koovela.

**Why this priority**: é a cobrança recorrente exigida pela `[D13]`.

**Independent Test**: com um tenant de teste, um mês de agendamentos e o cartão cadastrado, fechar o ciclo e conferir a fatura (itens, total), a cobrança automática, a nota fiscal da Koovela e o aviso ao Proprietário.

**Acceptance Scenarios**:

1. **Given** o fim do ciclo, **When** a fatura é gerada, **Then** lista: assinatura do plano (proporcional, se houve troca no ciclo), taxas por agendamento do ciclo (quantidade e valor, com o detalhe disponível), taxas já retidas no split (só informativas, conforme `[PEN-09]`), descontos e concessões (spec 021) e o total.
2. **Given** a forma de cobrança da taxa por agendamento, **When** a fatura é montada, **Then** inclui só a taxa dos agendamentos pagos no local; a taxa dos pagos pela plataforma já foi retida no split e aparece na fatura apenas como informação (`[PEN-09]` resolvido); os excedentes de SMS e de WhatsApp transacionais entram como linhas próprias.
3. **Given** a fatura, **When** vence, **Then** o cartão cadastrado é cobrado automaticamente; com Pix, o Proprietário recebe o QR por e-mail e no painel 5 dias antes.
4. **Given** a fatura paga, **When** confirmada, **Then** a nota fiscal da Koovela (serviço de software) é emitida para o tenant pelo adaptador fiscal da spec 017, com a Koovela como emitente, e enviada ao Proprietário.
5. **Given** "Assinatura Koovela e faturas", **When** o Proprietário abre, **Then** vê o plano, o uso do ciclo atual (agendamentos tarifados até agora e a estimativa da próxima fatura), as faturas anteriores com estado, nota e comprovante.
6. **Given** o mesmo pedido de cobrança reenviado, **When** processado, **Then** gera uma única cobrança (CONST III).

---

### User Story 3 - Inadimplência com régua clara e suspensão sem surpresa (Priority: P1)

Como Financeiro/Ops, quero uma régua automática de cobrança para faturas em atraso; como Proprietário, quero ser avisado com antecedência e saber exatamente o que acontece se eu não pagar.

**Why this priority**: DF 3.4.7 e DF 5.1 (régua de inadimplência e suspensão por falta de pagamento).

**Independent Test**: simular uma fatura não paga e avançar o relógio pelos dias da régua, conferindo as tentativas, os avisos, o modo restrito, a suspensão do tenant (spec 002) e a reativação imediata ao pagar.

**Acceptance Scenarios**:

1. **Given** uma fatura com cobrança recusada ou Pix não pago no vencimento, **When** o vencimento passa, **Then** a assinatura fica `em_atraso`, o cartão é tentado de novo nos dias 1, 3 e 5, e o Proprietário é avisado a cada tentativa, com o link para pagar por Pix ou trocar o cartão.
2. **Given** 7 dias de atraso (padrão, configurável), **When** o prazo chega, **Then** o tenant entra em modo restrito: o painel mostra um aviso permanente e não permite criar filiais, convidar equipe nem ativar funções novas; o consumidor não percebe nada e os agendamentos continuam.
3. **Given** 15 dias de atraso (padrão, configurável), **When** o prazo chega, **Then** o tenant é suspenso pelo comando da spec 002: o consumidor não consegue fazer novos agendamentos (a página mostra a mensagem neutra da spec 005), os agendamentos já confirmados continuam visíveis e são honrados, e o painel só permite pagar, exportar dados e falar com o suporte.
4. **Given** um tenant em modo restrito ou suspenso, **When** a fatura é paga, **Then** volta a `ativa` em até 5 minutos, sem perda de dados.
5. **Given** 90 dias de suspensão sem pagamento, **When** o prazo chega, **Then** a assinatura é encerrada e o tenant arquivado pela spec 002, com aviso prévio de 15 dias; nenhum dado é apagado (REQ-TEN-013).
6. **Given** a régua, **When** o Financeiro/Ops precisa, **Then** pode pausá-la para um tenant (acordo de pagamento), com motivo, prazo e registro na trilha de auditoria.

---

### User Story 4 - Mudar de plano, de faixa ou cancelar (Priority: P2)

Como Proprietário, quero mudar de plano quando o negócio crescer ou diminuir e cancelar quando quiser, sabendo o que acontece com a cobrança e com os dados.

**Why this priority**: faixas por porte (DF 5.2) só funcionam se a troca for simples; o cancelamento é direito do cliente.

**Independent Test**: num tenant de teste, subir de plano no meio do ciclo (cobrança proporcional), tentar convidar um colaborador além da faixa (aviso de troca), descer de plano (vale no ciclo seguinte) e cancelar (vale no fim do ciclo).

**Acceptance Scenarios**:

1. **Given** um plano, **When** o Proprietário sobe de plano no meio do ciclo, **Then** a mudança vale na hora e a diferença proporcional entra na próxima fatura.
2. **Given** um plano, **When** o Proprietário desce de plano, **Then** a mudança vale no início do próximo ciclo, desde que o uso caiba na nova faixa; senão, a tela mostra o que precisa ser reduzido.
3. **Given** a faixa do plano, **When** o Proprietário tenta convidar colaborador ou criar filial além do limite, **Then** é avisado e convidado a subir de plano; nada que já existe é bloqueado e nenhum agendamento de consumidor é afetado.
4. **Given** o cancelamento, **When** o Proprietário cancela, **Then** a assinatura vale até o fim do ciclo pago, a última fatura inclui as taxas do ciclo, e depois o tenant é suspenso e, após 90 dias, arquivado (spec 002), com a opção de exportar os dados antes (spec 022).
5. **Given** um tenant cancelado ou arquivado, **When** o Proprietário volta até 90 dias depois do encerramento da assinatura (enquanto o tenant estiver arquivado pela spec 002), **Then** pode reativar a assinatura e recupera tudo.

---

### User Story 5 - Gestão de planos e inadimplência no back-office (Priority: P2)

Como Financeiro/Ops ou Comercial/Growth, quero manter os planos e valores, acompanhar a inadimplência e a recuperação, e agir em cada tenant.

**Why this priority**: tela "Planos, cobrança e inadimplência" (DF 9.5); sem ela, valores e régua ficam no código, contra a CONST 8.

**Independent Test**: no back-office, criar um plano novo com vigência futura, conferir que tenants atuais não mudam; ver a lista de inadimplentes por dias de atraso e pausar a régua de um deles.

**Acceptance Scenarios**:

1. **Given** o back-office, **When** a Gestão cria ou altera um plano (preço, faixas, taxa por agendamento, funções incluídas), **Then** cria uma nova versão com vigência; tenants atuais mantêm a versão contratada até o primeiro ciclo que começa a partir da vigência da nova versão, com aviso de 30 dias antes de qualquer aumento.
2. **Given** a lista de inadimplência, **When** aberta, **Then** mostra tenants por dias de atraso e valor, com a etapa da régua, o histórico de tentativas e as ações (pausar régua, registrar acordo, cobrar de novo).
3. **Given** a mudança de plano, preço ou régua, **When** feita, **Then** exige aprovação do Financeiro/Ops (quando feita pelo Comercial/Growth) e gera registro na trilha de auditoria.

---

### Edge Cases

- **Degustação (concessão da spec 021) terminando**: 7 dias antes, o Proprietário é avisado; sem forma de pagamento ao fim, a assinatura segue a régua a partir do primeiro vencimento.
- **Taxa por agendamento estornado ou cancelado depois do fechamento do ciclo**: crédito na fatura seguinte.
- **Taxa retida no split** e estorno do pagamento: a taxa é devolvida junto pelo split (spec 012).
- **Cartão expirando antes do vencimento**: aviso 10 dias antes.
- **Tenant com vários negócios**: uma assinatura por tenant (Cliente), com faixas contando colaboradores e filiais de todos os negócios.
- **Mudança de preço**: nunca no meio do ciclo; aviso de 30 dias.
- **Suspensão com agendamentos já pagos pelo consumidor**: continuam válidos e os repasses ao tenant seguem normalmente; só a fatura da Koovela fica em aberto.
- **Fatura com valor zero** (degustação, concessão total): gerada para registro, sem cobrança e sem nota.
- **Excedentes da fase 2 e 3** (envios de CRM `[D32]`, pacotes de destaque `[D37]`): o modelo de fatura aceita itens de uso adicionais, sem migração.

---

## Requirements *(mandatory)*

Formato: `REQ-ASS-NNN (origem: …)`.

### Functional Requirements

**Planos**

- **REQ-ASS-001** (origem: D13 | DF 5.1 | DF 5.2): O plano DEVE ter: nome, preço mensal, faixas (colaboradores e filiais), taxa por agendamento (valor fixo ou percentual), base da taxa, funções incluídas e vigência; versionado.
- **REQ-ASS-002** (origem: PEN-08 | CONST 8): Valores, faixas por porte, política do autônomo, base da taxa, cotas de SMS e de WhatsApp transacionais e preços dos excedentes, prazos da régua e prazos de aviso (Pix, cartão a vencer, fim da degustação, aumento de preço) DEVEM ser configuráveis no back-office, versionados, sem valor fixo no código e sem plano gratuito pré-definido.
- **REQ-ASS-003** (origem: REQ-FLG-015): Funções incluídas por plano DEVEM ser controladas por este domínio, não por feature flags; as funções incluídas em cada plano DEVEM ser configuráveis no back-office (`[PEN-08]` decidido: tudo configurável); valor inicial: todos os planos com todas as funções, diferindo só por faixas.
- **REQ-ASS-004** (origem: CONST III): A mudança de plano ou preço pela Gestão NÃO DEVE afetar o ciclo em curso; aumentos exigem aviso de 30 dias.

**Assinatura**

- **REQ-ASS-010** (origem: D13): Cada tenant (Cliente) DEVE ter uma assinatura, com plano, forma de pagamento (cartão recorrente ou Pix por fatura), ciclo mensal, estado e datas.
- **REQ-ASS-011** (origem: CONST V | REQ-IDN-022): Cadastrar ou trocar a forma de pagamento DEVE exigir reautenticação com segundo fator e gerar registro na trilha de auditoria; dados de cartão seguem a REQ-PAG-003.
- **REQ-ASS-012** (origem: DF 5.2): Subir de plano DEVE valer na hora, com cobrança proporcional na próxima fatura; descer DEVE valer no próximo ciclo, se o uso couber na faixa.
- **REQ-ASS-013** (origem: DF 5.2): Ultrapassar a faixa DEVE impedir só novos convites e novas filiais, com convite a subir de plano; nunca DEVE bloquear o que já existe nem agendamentos de consumidores.
- **REQ-ASS-014** (origem: CDC | DF 3.4.7): O cancelamento DEVE valer até o fim do ciclo pago, seguido de suspensão e, após 90 dias, arquivamento (spec 002), com opção de exportar os dados (spec 022) e de reativar em até 90 dias.
- **REQ-ASS-015** (origem: DF 3.4.3): A degustação e as concessões (spec 021) DEVEM ser aplicadas pela assinatura (estado `em_degustação`, descontos na fatura), com aviso 7 dias antes do fim.

**Fatura e cobrança**

- **REQ-ASS-020** (origem: D13 | DF 5.1): Ao fim do ciclo, DEVE ser gerada a fatura com assinatura (proporcional quando couber), taxas por agendamento do ciclo (com detalhe), taxas retidas no split (informativas), descontos, concessões, créditos e total, em centavos.
- **REQ-ASS-021** (origem: PEN-09 | REQ-PAG-042): A taxa por agendamento DEVE ser retida no split nos pagamentos pela plataforma e cobrada na fatura nos pagamentos no local.
- **REQ-ASS-022** (origem: CONST III): A cobrança DEVE ser idempotente e passar pelo adaptador de pagamento (`PaymentProvider`, spec 012); o cartão é cobrado no vencimento; o Pix é enviado 5 dias antes.
- **REQ-ASS-023** (origem: D13 | REQ-FIS-040): Fatura paga com valor maior que zero DEVE gerar a nota fiscal da Koovela para o tenant, pelo adaptador fiscal da spec 017, com a Koovela como emitente.
- **REQ-ASS-024** (origem: DF 9.3): "Assinatura Koovela e faturas" DEVE mostrar plano, uso do ciclo atual com estimativa da próxima fatura, faturas anteriores com estado, nota e comprovante.
- **REQ-ASS-025** (origem: CONST III): Taxas de agendamentos estornados ou cancelados depois do fechamento do ciclo DEVEM virar crédito na fatura seguinte.
- **REQ-ASS-026** (origem: D32 | D37 | CONST 2): A fatura DEVE aceitar itens de uso adicionais (excedente de envios do CRM, pacotes de destaque) sem migração destrutiva.

**Inadimplência e suspensão**

- **REQ-ASS-030** (origem: DF 3.4.7 | DF 5.1): A régua de inadimplência DEVE ter: novas tentativas no cartão nos dias 1, 3 e 5 após o vencimento; aviso ao Proprietário a cada etapa; modo restrito no dia 7; suspensão no dia 15; encerramento e arquivamento no dia 90, com aviso 15 dias antes; todos os prazos configuráveis no back-office.
- **REQ-ASS-031** (origem: DF 3.4.7): O modo restrito DEVE mostrar aviso permanente no painel e impedir novas filiais, novos convites e ativação de funções; NÃO DEVE afetar o consumidor.
- **REQ-ASS-032** (origem: REQ-TEN-011 | REQ-NEG-053): A suspensão DEVE usar o comando de suspensão da spec 002: novos agendamentos de consumidores ficam impedidos (mensagem neutra na página), agendamentos confirmados são honrados, e o painel permite só pagar, exportar dados e falar com o suporte.
- **REQ-ASS-033** (origem: DF 3.4.7): O pagamento da fatura em atraso DEVE reativar o tenant em até 5 minutos, sem perda de dados.
- **REQ-ASS-034** (origem: CONST V): O Financeiro/Ops DEVE poder pausar a régua de um tenant, com motivo, prazo e registro na trilha de auditoria.
- **REQ-ASS-035** (origem: REQ-TEN-013): Nenhuma etapa da régua DEVE apagar dados do tenant.

**Back-office**

- **REQ-ASS-040** (origem: DF 9.5 "Planos, cobrança e inadimplência"): O back-office DEVE permitir criar e versionar planos, ver a inadimplência por dias de atraso e valor, a etapa da régua e o histórico, e agir (pausar, acordo, nova cobrança).
- **REQ-ASS-041** (origem: CONST V | DF 2.5): Mudanças de plano, preço e régua feitas pelo Comercial/Growth DEVEM exigir aprovação do Financeiro/Ops; todas geram registro na trilha de auditoria.

**Isolamento, contratos e eventos**

- **REQ-ASS-050** (origem: CONST II | CONST 4.4): Assinaturas e faturas ficam no espaço `koovela_platform` (da plataforma, não do tenant), ligadas ao identificador do tenant; o tenant vê só as próprias.
- **REQ-ASS-051** (origem: CONST VII): O domínio DEVE publicar contratos de consulta (plano vigente, faixas, funções incluídas, estado da assinatura) usados pelas specs 005, 014, 021 e 028, e eventos de mudança de estado.
- **REQ-ASS-052** (origem: REQ-NEG-016): A exigência de "assinatura ativa para publicar" da spec 005 DEVE ser atendida pelo contrato de entitlements deste domínio.

### Key Entities

- **Plano** (versionado): nome, preço, faixas, taxa por agendamento e base, funções incluídas, vigência.
- **Assinatura**: tenant, plano e versão, forma de pagamento (referência), ciclo, estado, datas, degustação e concessões aplicadas.
- **Fatura**: assinatura, ciclo, itens, total, vencimento, estado, cobrança (referência no PSP), nota fiscal da Koovela.
- **Item de fatura**: tipo (assinatura, proporcional, taxa por agendamento, informativo do split, desconto, concessão, crédito, uso adicional), quantidade, valor, referência.
- **Etapa da régua**: fatura, etapa, data, resultado, aviso enviado.
- **Acordo ou pausa da régua**: tenant, motivo, prazo, ator.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (DF 9.3) | Assinatura Koovela e faturas · escolha de plano · aviso de modo restrito e de suspensão | Registrados no plano |
| Painel (onboarding) | Escolha de plano e forma de pagamento | Registrado no plano |
| Back-office (DF 9.5) | Planos, cobrança e inadimplência | Registrado no plano |

---

## Regras e estados

**Reativação**: possível até `reactivable_until` = encerramento + 90 dias, enquanto o tenant estiver arquivado.

**Assinatura**: `em_degustação` → `ativa` · `ativa` → `em_atraso` (vencimento não pago) → `restrita` (dia 7) → `suspensa` (dia 15; tenant `suspenso` na spec 002) → `encerrada` (dia 90; tenant `arquivado`) · `em_atraso` | `restrita` | `suspensa` → `ativa` (pagamento) · `ativa` → `cancelamento_agendado` → `suspensa` (fim do ciclo) → `encerrada` (90 dias) · `encerrada` → `ativa` (reativação em até 90 dias do encerramento, enquanto o tenant estiver arquivado).

**Fatura**: `aberta` (ciclo em curso) → `emitida` → `paga` | `em_atraso` → `paga` | `cancelada` (acordo); `paga` → `com_crédito` (créditos posteriores).

**Efeitos por estado**:

| Estado | Painel | Consumidor |
|---|---|---|
| `ativa`, `em_degustação` | Normal | Normal |
| `em_atraso` | Aviso | Normal |
| `restrita` | Aviso permanente; sem novas filiais, convites e funções | Normal |
| `suspensa` | Só pagar, exportar, suporte | Sem novos agendamentos; confirmados honrados |

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Dados de cobrança do tenant (documento, endereço fiscal) | Dado da empresa; pessoal quando autônomo pessoa física | Execução de contrato; obrigação legal (art. 7, II e V) | Contrato + 5 anos | Proprietário; Financeiro/Ops |
| Forma de pagamento (referência do PSP, final do cartão) | Pessoal (financeiro) | Execução de contrato | Até a troca ou o fim do contrato | Proprietário; Financeiro/Ops (sem dados do cartão) |
| Faturas, notas e histórico da régua | Dado da empresa | Obrigação legal | 5 anos | Proprietário; Financeiro/Ops |
| Uso tarifado (agendamentos contados) | Agregado por tenant, com identificadores de agendamento | Execução de contrato | 5 anos | Proprietário; Financeiro/Ops |

Regras: o detalhe da taxa por agendamento mostra apenas data, serviço e valor, sem dados de consumidores; dados de cartão nunca passam pela Koovela (REQ-PAG-003).

---

## Permissões

| Ação | Proprietário | Gerente | Fin/Ops | Comercial/Growth | SRE | Suporte |
|---|---|---|---|---|---|---|
| Escolher e mudar plano; forma de pagamento; cancelar | ✔ | — | — | — | — | — |
| Ver faturas e uso | ✔ | — | ✔ | ✔ (leitura) | — | ✔* (leitura) |
| Criar e versionar planos e preços | — | — | ✔ | ✔ (com aprovação do Fin/Ops) | — | — |
| Pausar régua, registrar acordo, nova cobrança | — | — | ✔ | — | — | — |
| Configurar prazos da régua | — | — | ✔ | — | — | — |
| Suspender e reativar tenant manualmente | — | — | ✔ (via régua) | — | ✔ (spec 002) | — |

`✔*` = apenas em sessão de suporte (spec 003). O Gerente não vê nada da assinatura.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `billing.subscription.{trialing,activated,plan_changed,cancel_scheduled,ended,reactivated,trial_ending,card_expiring}.v1` | Ciclo da assinatura |
| `billing.subscription.{past_due,retry_failed,restricted,suspended,end_warning}.v1` | Régua de inadimplência (a suspensão dispara o comando da spec 002) |
| `billing.invoice.{issued,pix_sent,paid,past_due,cancelled,credited}.v1` | Faturas |
| `billing.plan_version.{proposed,approved,effective}.v1` | Novo plano ou preço |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Inadimplência (valor em atraso / faturado) | DF 3.4.7 | Acompanhada |
| Recuperação (faturas em atraso pagas / em atraso) | DF 3.4.7 | Acompanhada |
| ARPA, NRR, churn de tenant | DF 14 | Acompanhadas |
| Receita de taxas por agendamento por tenant | DF 5.2 | Acompanhada |
| Conversão de degustação em assinatura paga | DF 3.4.3 | Acompanhada (com a spec 021) |
| Margem por tenant (receita Koovela − custo de infraestrutura e envios) | DF 14 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O Proprietário escolhe um plano e cadastra a forma de pagamento em até 3 minutos.
- **SC-002**: 100% das faturas trazem, item a item, assinatura e taxas com total exato em centavos, e o Proprietário pode ver o detalhe de cada agendamento tarifado.
- **SC-003**: Nenhuma cobrança é feita em duplicidade, em 100% dos testes de reenvio.
- **SC-004**: Nenhum consumidor é afetado antes da suspensão, e nenhum agendamento confirmado é cancelado pela suspensão.
- **SC-005**: Um tenant suspenso volta a funcionar em até 5 minutos depois de pagar.
- **SC-006**: Nenhum dado de tenant é apagado por inadimplência ou cancelamento, verificado por teste.
- **SC-007**: Nenhum valor de plano, taxa ou prazo da régua está fixo no código, verificado por revisão e por teste de configuração.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-08** — valores, faixas, autônomo e base da taxa | Planos, simulação, receita | **Resolvido (clarify 2026-11-25)**: tudo configurável |
| **PEN-09** — taxa retida no split ou na fatura | Composição da fatura; spec 012 | **Resolvido (clarify 2026-11-25)**: split + fatura |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| Requisitos de publicação (REQ-NEG-016) | Spec 005 | Este domínio fornece o estado da assinatura para essa regra |
| Concessões e degustação | Spec 021 | Aplicadas pela assinatura |
| **PEN-30** — valores de destaque e de parceiros | Fase 3 | O modelo de fatura já aceita esses itens |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Régua | ASSUMIDO: tentativas nos dias 1, 3 e 5; restrito no dia 7; suspensão no dia 15; encerramento no dia 90 |
| Formas de pagamento | ASSUMIDO: cartão recorrente e Pix por fatura; boleto fora |
| Assinatura | ASSUMIDO: uma por tenant (Cliente), mesmo com vários negócios |
| Funções por plano | Configurável no back-office; valor inicial: todas as funções em todos os planos |
| Base da taxa | Configurável no back-office; valor inicial: só agendamentos concluídos e pagos |

---

## Fora do escopo desta especificação

- Concessões, degustação, descontos comerciais e KYC do tenant (spec 021).
- Split, cobrança ao consumidor e PSP (spec 012).
- Emissão de notas do serviço do tenant ao consumidor (spec 017); aqui só a nota da Koovela ao tenant.
- Cotas e excedentes de CRM (spec 028) e pacotes de destaque (spec 032), que usam o modelo de fatura desta spec.
- Pagamento a parceiros indicadores (spec 038).
- Boleto bancário e cobrança judicial.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: escolha de plano em até 3 minutos; Pix enviado 5 dias antes do vencimento; aviso de cartão expirando 10 dias antes; aviso de fim de degustação 7 dias antes; aviso de aumento 30 dias antes; reativação em até 5 minutos; prazos da régua (1, 3, 5, 7, 15 e 90 dias).
- A cobrança recorrente usa o mesmo adaptador de pagamento da spec 012, com a Koovela como recebedora.
- A Koovela emite a própria nota fiscal pelo adaptador da spec 017, como prestadora do serviço de software.
- O domínio dono desta spec é `billing` (CONST 4.4), com os dados no espaço `koovela_platform`.
