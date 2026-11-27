# Feature Specification: Fiscal e NFS-e

**Feature Branch**: `017-fiscal-nfse`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "017 fiscal-nfse — seguir a sequência da constituição (seção 10): J7 (parte fiscal). Depende de 012. Pendência PEN-21. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (São Paulo primeiro, `[D20]`)

**Superfícies afetadas**: painel do cliente (passo "certificado de NFS-e" do onboarding; "NFS-e: emissão e histórico"; dados fiscais de cada serviço) · app do consumidor e web do consumidor (nota disponível no agendamento concluído; "CPF na nota") · app do colaborador e `/pro` (emissão no check-out, quando o papel permitir) · back-office (falhas de emissão e certificados a vencer)

**Depende de**: 012 `pagamentos-split` (e, por ela, 002 a 011)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III, IV, V, VII, IX, seções 2, 4.4 (`fiscal`), 5, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.1, 2.2, 3.2.12, 6, 7, 8 (J4, J7), 9.2, 9.3, 11.6, 12, 17 (`[D20]`, `[D33]`) e 18 (`[PEN-21]`, `[PEN-24]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O estabelecimento precisa "cumprir a obrigação fiscal" (DF 3.2.12): emitir a nota fiscal de serviço eletrônica (NFS-e) dos atendimentos. Hoje, muitos emitem à mão no portal da prefeitura no fim do mês, ou não emitem. A NFS-e está na v1.0, começando por São Paulo `[D20]`, e faz parte do fechamento financeiro da J7 (atendimentos concluídos → comissão → split → repasse → **NFS-e** → conciliação).

A pergunta central ainda está aberta (`[PEN-21]`): **quem é o emitente** da nota do serviço prestado ao consumidor — o tenant, com certificado digital próprio, ou a Koovela? A constituição já fixa que a Koovela **intermedeia e não executa o serviço** (CONST 5), o que pesa nessa decisão.

Esta spec cobre a nota do serviço prestado pelo estabelecimento ao consumidor. A cobrança da própria Koovela ao tenant (assinatura e taxas) é da spec 019.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.2.12 | Cumprir obrigação fiscal | % com nota emitida |
| 3.2.5 | Gerir agenda e comissões | Tempo de fechamento |
| 2.1 (etapa 2) | Consumidor recebe nota fiscal | Notas entregues ao consumidor |

Personas: Proprietário; Recepção, Gerente e Financeiro/Ops (DF 7, "Emitir NFS-e"); consumidor; contador do estabelecimento (indiretamente, pela exportação).

---

## Clarifications

### Session 2026-11-25

- Q: Quem emite a NFS-e do serviço ao consumidor? (PEN-21) → A: Configurável por negócio: o tenant emite com certificado próprio (a Koovela integra e emite em nome dele) ou usa a nota da Koovela, em especial o autônomo. Risco: a emissão pela Koovela conflita com a CONST 5 ("a Koovela intermedeia e não executa o serviço") e precisa de validação com contador e revisão dos termos e da CONST 5 antes de ser ligada.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar a emissão de notas (Priority: P1)

Como Proprietário, quero informar meu perfil fiscal, enviar meu certificado digital e definir os dados fiscais dos meus serviços, para que as notas sejam emitidas sem eu precisar entrar no portal da prefeitura.

**Why this priority**: é o passo "certificado de NFS-e" do onboarding (DF 9.2, J4); sem ele, nenhuma nota sai.

**Independent Test**: num ambiente de homologação da prefeitura de São Paulo, cadastrar o perfil fiscal de uma empresa de teste, enviar um certificado de teste, preencher o código de serviço e a alíquota de um serviço, e emitir uma nota de teste.

**Acceptance Scenarios**:

1. **Given** o passo fiscal do onboarding, **When** o Proprietário começa, **Then** informa o perfil do emitente: pessoa jurídica (regime tributário: Simples Nacional, lucro presumido ou outro), MEI, ou pessoa física sem CNPJ.
2. **Given** a definição do emitente, **When** a plataforma decide quem emite, **Then** segue a configuração do negócio (`[PEN-21]` resolvido): "emissão própria", em que o tenant é o emitente com certificado próprio e a Koovela emite em nome dele; ou "nota pela Koovela", pensada para o autônomo, em que a Koovela emite. A opção "nota pela Koovela" fica desligada por flag até a validação com contador e a revisão da cláusula de termos da CONST 5.
3. **Given** um emitente pessoa jurídica ou MEI, **When** o Proprietário envia o certificado digital (tipo A1) e a senha, **Then** o certificado é validado (titular, validade), guardado cifrado, e a senha nunca é exibida nem registrada em log.
4. **Given** uma rede com filiais de CNPJ diferentes, **When** configurada, **Then** cada filial escolhe o emitente (CNPJ) que emite as notas dela.
5. **Given** os serviços do catálogo (spec 006), **When** o Proprietário define os dados fiscais, **Then** cada serviço tem código de serviço municipal (ou nacional), alíquota do ISS e indicação de retenção, com sugestão pela categoria da vertical.
6. **Given** um emitente pessoa física sem CNPJ, **When** configurado, **Then** a plataforma explica que não emite NFS-e para ele e oferece só o recibo do atendimento (não fiscal), com a orientação de procurar o contador.
7. **Given** um certificado a 30 dias de vencer, **When** o prazo chega, **Then** o Proprietário é avisado; vencido, a emissão para e o painel mostra a pendência.

---

### User Story 2 - Nota emitida automaticamente a cada atendimento pago (Priority: P1)

Como Proprietário, quero que a nota de cada atendimento concluído e pago seja emitida sozinha, e que o consumidor a receba.

**Why this priority**: é a etapa fiscal da J7 e o indicador "% com nota emitida" (DF 3.2.12).

**Independent Test**: concluir e pagar três atendimentos de teste (Pix, cartão e no local) com emissão automática ligada, e conferir as três notas emitidas, os números, os PDFs e o envio ao consumidor.

**Acceptance Scenarios**:

1. **Given** a emissão automática ligada (padrão: ligada quando o perfil fiscal está completo), **When** um atendimento fica concluído e pago (specs 009 e 012), **Then** a nota é pedida à prefeitura com o valor efetivamente pago pelo serviço, descrição do serviço, dados do emitente e, se o consumidor quiser, o CPF dele.
2. **Given** o consumidor com CPF na etapa 2 (spec 003), **When** agenda, **Then** escolhe "CPF na nota" (padrão: sim, se tiver CPF); sem CPF, a nota sai sem identificação do tomador, quando a prefeitura permitir.
3. **Given** a nota autorizada, **When** volta da prefeitura, **Then** fica ligada ao agendamento e ao pagamento, com número, código de verificação e PDF, e o consumidor recebe o link (spec 011) e a encontra no agendamento concluído.
4. **Given** a emissão automática desligada, **When** o atendimento é concluído e pago, **Then** ele fica na lista "a emitir" do painel, para emissão manual, individual ou em lote.
5. **Given** um atendimento pago no local (REQ-PAG-030), **When** concluído, **Then** a nota é emitida da mesma forma, com o valor registrado.
6. **Given** um atendimento de valor zero, uma multa de não comparecimento ou um sinal ainda não convertido em atendimento, **When** a emissão é avaliada, **Then** nenhuma nota de serviço é emitida para eles.
7. **Given** a compra de um pacote de sessões (spec 006), **When** paga, **Then** a nota segue a regra de momento de emissão do negócio (padrão: a cada sessão concluída, pelo valor da sessão coberta, com a venda registrada como adiantamento); se o negócio escolher "na venda", a nota sai pelo valor do pacote e as sessões consumidas não geram nova nota.

---

### User Story 3 - Falhas, contingência e cancelamento (Priority: P1)

Como Proprietário e Financeiro/Ops, quero que uma nota recusada ou que não pôde ser emitida por falha da prefeitura seja tentada de novo, com o motivo visível, e que um estorno cancele a nota quando a regra permitir.

**Why this priority**: o sistema da prefeitura fica fora do ar e recusa notas com frequência; sem tratamento, a nota some e o estabelecimento fica irregular.

**Independent Test**: simular a prefeitura fora do ar e conferir a fila de novas tentativas; simular uma recusa por código de serviço inválido e conferir o motivo e a correção; estornar um pagamento e conferir o cancelamento da nota.

**Acceptance Scenarios**:

1. **Given** o sistema da prefeitura indisponível, **When** a emissão falha, **Then** o pedido fica numa fila e é tentado de novo com intervalos crescentes por até 72 horas, sem duplicar a nota (chave de idempotência).
2. **Given** uma recusa pela prefeitura (dado inválido), **When** acontece, **Then** o painel mostra o motivo em linguagem simples, o que corrigir e a opção de emitir de novo; o Proprietário é avisado.
3. **Given** um estorno total (spec 012), **When** acontece dentro do prazo de cancelamento da prefeitura, **Then** a nota é cancelada e o consumidor é avisado; fora do prazo, o estorno fica registrado com a pendência fiscal para o contador.
4. **Given** um estorno parcial, **When** acontece, **Then** a nota não é cancelada automaticamente; a pendência aparece para o Proprietário decidir com o contador (cancelar e reemitir, ou manter).
5. **Given** notas pendentes há mais de 24 horas, **When** o prazo passa, **Then** o Proprietário e o Financeiro/Ops são avisados.

---

### User Story 4 - Histórico, consulta e exportação para o contador (Priority: P2)

Como Proprietário, quero ver todas as notas emitidas, pendentes, recusadas e canceladas, e exportar o mês para o meu contador.

**Why this priority**: tela "NFS-e: emissão e histórico" (DF 9.3); o fechamento mensal depende disso (DF 3.2.5).

**Independent Test**: com notas de teste em vários estados num mês, abrir o histórico, filtrar por estado e filial, e exportar o mês em planilha e com os arquivos das notas.

**Acceptance Scenarios**:

1. **Given** "NFS-e: emissão e histórico", **When** o Proprietário abre, **Then** vê as notas por período, filial, emitente e estado (a emitir, em processamento, autorizada, recusada, cancelada), com totais de valor e de ISS.
2. **Given** um mês, **When** exportado, **Then** gera uma planilha com todas as notas e um arquivo compactado com os XMLs e PDFs das notas autorizadas e canceladas.
3. **Given** uma nota, **When** aberta, **Then** mostra o agendamento, o pagamento, o consumidor (com CPF mascarado), o histórico de tentativas e o link para a consulta pública da prefeitura.
4. **Given** um atendimento concluído e pago sem nota, **When** o mês fecha, **Then** aparece no relatório de pendências.

---

### User Story 5 - Emissão manual e nota avulsa (Priority: P3)

Como Recepção, Gerente ou Proprietário, quero emitir manualmente a nota de um atendimento ou reemitir uma corrigida.

**Why this priority**: casos fora do automático (emissão desligada, correção de dados do tomador, pedido do consumidor depois do atendimento).

**Independent Test**: com a emissão automática desligada, emitir pela Recepção a nota de um atendimento; corrigir o CPF do consumidor e reemitir após cancelar a anterior.

**Acceptance Scenarios**:

1. **Given** um atendimento concluído e pago, **When** a Recepção, o Gerente, o Proprietário ou o Financeiro/Ops emite a nota manualmente, **Then** segue o mesmo fluxo da emissão automática, com o ator registrado.
2. **Given** o consumidor que pede a nota com CPF depois do atendimento, **When** a nota ainda não foi emitida, **Then** a equipe acrescenta o CPF e emite; quando já foi, cancela e reemite dentro do prazo da prefeitura.
3. **Given** toda emissão, cancelamento ou reemissão manual, **When** feita, **Then** é registrada na trilha de auditoria (spec 004).

---

### Edge Cases

- **Combo**: uma nota com o valor total pago e a descrição das etapas; o código de serviço é o da etapa principal, ou uma nota por código de serviço diferente, com o valor pago rateado pelo rateio do combo (spec 006).
- **Resgate de fidelidade "serviço grátis"** (spec 015): sem valor pago, sem nota.
- **Desconto de horário ocioso ou de fidelidade**: a nota é emitida pelo valor efetivamente pago.
- **Pagamento parcial** (sinal online e restante no local): uma nota pelo total, depois que o atendimento é concluído e o total está pago.
- **Mudança de alíquota ou de código de serviço**: vale para notas emitidas a partir da mudança; as já emitidas não mudam.
- **Filial fora de São Paulo**: na v1.0, só emite se o município estiver coberto pelo meio de emissão escolhido no plano (prefeitura de São Paulo ou padrão nacional); senão, a filial fica com emissão indisponível e o atendimento entra no relatório de pendências.
- **Profissional autônomo de saúde pessoa física**: a plataforma não emite NFS-e; o painel informa a obrigação de recibo da Receita Federal para profissionais de saúde pessoa física, que fica fora da plataforma na v1.0.
- **Reforma tributária** (IBS e CBS a partir de 2026): os campos e o leiaute da nota seguem o padrão vigente da prefeitura e do padrão nacional na data da emissão; mudanças de leiaute são tratadas como mudança do adaptador fiscal, não da regra de negócio.
- **Certificado trocado**: as notas seguintes usam o novo; as anteriores não mudam.

---

## Requirements *(mandatory)*

Formato: `REQ-FIS-NNN (origem: …)`.

### Functional Requirements

**Emitente e configuração**

- **REQ-FIS-001** (origem: PEN-21 | CONST 5): O emitente DEVE ser configurável por negócio: "emissão própria" (tenant emitente, com certificado próprio; padrão) ou "nota pela Koovela" (Koovela emitente, voltada ao autônomo). A opção "nota pela Koovela" DEVE ficar desligada por flag (spec 004) até parecer de contador sobre base do ISS e responsabilidade, e até a revisão da cláusula "a Koovela intermedeia e não executa o serviço" (CONST 5), que pode exigir emenda.
- **REQ-FIS-002** (origem: DF 2.2 | D20): O perfil fiscal do emitente DEVE ter: tipo (pessoa jurídica, MEI, pessoa física sem CNPJ), CNPJ ou CPF, inscrição municipal, regime tributário, município e endereço fiscal (dados cadastrais da spec 005).
- **REQ-FIS-003** (origem: DF 9.2 | CONST IV): O certificado digital (A1) DEVE ser validado no envio, guardado cifrado com a chave fora do banco, e a senha NUNCA DEVE ser exibida nem registrada em log; troca e remoção exigem reautenticação com segundo fator.
- **REQ-FIS-004** (origem: D05): Cada filial DEVE indicar o emitente (CNPJ) das próprias notas.
- **REQ-FIS-005** (origem: D20 | REQ-CAT-007): Cada serviço DEVE ter código de serviço municipal ou nacional, alíquota do ISS e indicação de retenção, com sugestão pela categoria da vertical; serviço sem dados fiscais impede a emissão automática dele e aparece como pendência.
- **REQ-FIS-006** (origem: edge case): Para emitente pessoa física sem CNPJ, a plataforma NÃO DEVE emitir NFS-e; DEVE oferecer o recibo do atendimento (não fiscal), com a orientação correspondente.
- **REQ-FIS-007** (origem: CONST X): Certificados DEVEM gerar aviso 30 dias antes do vencimento; vencidos, a emissão para com pendência visível.

**Emissão**

- **REQ-FIS-010** (origem: J7 | DF 3.2.12): Com emissão automática ligada (padrão quando o perfil fiscal está completo), todo atendimento concluído e pago DEVE gerar um pedido de nota com o valor efetivamente pago pelo serviço.
- **REQ-FIS-011** (origem: CONST IV | DF 2.1): O CPF do consumidor DEVE entrar na nota só se ele tiver CPF e escolher "CPF na nota" (padrão: sim quando tem CPF).
- **REQ-FIS-012** (origem: edge case): NÃO DEVEM gerar nota de serviço: atendimento de valor zero, multa de não comparecimento ou de cancelamento tardio, e sinal ainda não convertido em atendimento concluído.
- **REQ-FIS-013** (origem: PEN-24 | D33): Para pacotes de sessões, o momento da emissão DEVE ser configurável por negócio entre "a cada sessão concluída" (padrão, pelo valor da sessão coberta; venda como adiantamento) e "na venda"; o vale-presente sempre emite no uso (spec 029, REQ-VAL-030, `[PEN-24]` decidido em 2026-11-25). Validar com contador.
- **REQ-FIS-014** (origem: CONST III): A emissão DEVE ser idempotente (um atendimento ou venda, uma nota válida); reenvios nunca geram nota duplicada.
- **REQ-FIS-015** (origem: DF 2.1 | REQ-NOT-030): A nota autorizada DEVE ficar ligada ao agendamento e ao pagamento e ser enviada ao consumidor (spec 011) e disponível no agendamento concluído, no app e na web.
- **REQ-FIS-016** (origem: DF 7): A emissão manual (individual ou em lote) DEVE estar disponível para Recepção, Gerente, Proprietário e Financeiro/Ops, com registro do ator.

**Falhas e cancelamento**

- **REQ-FIS-020** (origem: CONST IX | CONST X): Falhas de comunicação com a prefeitura DEVEM ir para fila com novas tentativas em intervalos crescentes por até 72 horas.
- **REQ-FIS-021** (origem: DF 3.2.12): Recusas DEVEM mostrar o motivo em linguagem simples e o que corrigir, com aviso ao Proprietário.
- **REQ-FIS-022** (origem: REQ-PAG-052): Estorno total DEVE cancelar a nota quando estiver dentro do prazo da prefeitura; fora do prazo e em estorno parcial, DEVE registrar pendência fiscal para decisão do Proprietário.
- **REQ-FIS-023** (origem: CONST X): Notas pendentes há mais de 24 horas DEVEM gerar aviso ao Proprietário e ao Financeiro/Ops; falhas acumuladas por município DEVEM gerar alerta ao SRE.

**Histórico e exportação**

- **REQ-FIS-030** (origem: DF 9.3 "NFS-e: emissão e histórico"): A tela DEVE listar as notas por período, filial, emitente e estado, com totais de valor e ISS, e o detalhe de cada nota (agendamento, pagamento, tentativas, link de consulta pública).
- **REQ-FIS-031** (origem: DF 3.2.5): A exportação mensal DEVE gerar planilha e arquivo compactado com XMLs e PDFs das notas autorizadas e canceladas.
- **REQ-FIS-032** (origem: DF 3.2.12): DEVE existir relatório de atendimentos concluídos e pagos sem nota no período.
- **REQ-FIS-033** (origem: CONST IV guarda fiscal): XMLs e PDFs DEVEM ser guardados por no mínimo 5 anos.

**Cobertura e contratos**

- **REQ-FIS-040** (origem: D20 | CONST VII): A emissão DEVE passar por um adaptador fiscal isolado (como o `PaymentProvider` da spec 012), com a prefeitura de São Paulo na v1.0 e o padrão nacional quando o plano confirmar a cobertura; mudanças de leiaute ficam no adaptador.
- **REQ-FIS-041** (origem: D20): Filiais em municípios sem cobertura DEVEM ter a emissão indisponível, com aviso e pendências no relatório.
- **REQ-FIS-042** (origem: CONST V | REQ-AUD-001): Emissões manuais, cancelamentos, reemissões, troca de certificado e mudança de dados fiscais DEVEM gerar registro na trilha de auditoria.
- **REQ-FIS-043** (origem: CONST II): Perfil fiscal, certificados e notas ficam no espaço de dados do tenant.

### Key Entities

- **Emitente fiscal**: tenant, tipo, documento, inscrição municipal, regime, município, endereço, certificado (cifrado), validade, estado.
- **Configuração fiscal da filial**: filial, emitente, emissão automática (sim ou não), momento de emissão de pacotes.
- **Dados fiscais do serviço**: serviço, código de serviço, alíquota, retenção, vigência.
- **Nota fiscal** (`nfse`): emitente, agendamento ou venda, pagamento, tomador (CPF opcional), valor, ISS, código de serviço, estado, número, código de verificação, XML, PDF, tentativas, chave de idempotência.
- **Pendência fiscal**: nota ou atendimento, motivo (recusa, estorno fora do prazo, estorno parcial, sem dados fiscais, município sem cobertura), estado.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (onboarding, DF 9.2) | Recebedor, KYC e certificado de NFS-e (parte do certificado e do perfil fiscal) | Registrado no plano |
| Painel (DF 9.3) | NFS-e: emissão e histórico · dados fiscais em "Serviços e preços" | Registrados no plano |
| App e web do consumidor | Nota no agendamento concluído; "CPF na nota" no Resumo | Registrados no plano |
| Back-office | Falhas de emissão por município e certificados a vencer | Registrado no plano |

---

## Regras e estados

- **Nota**: `a_emitir` → `em_processamento` → `autorizada` | `recusada` (→ corrigida → `em_processamento`) | `em_espera` (prefeitura indisponível, nova tentativa) ; `autorizada` → `cancelada` (dentro do prazo) ; `autorizada` → `com_pendência` (estorno fora do prazo ou parcial).
- **Quando emitir**: atendimento concluído e com o valor total pago; pacotes conforme a configuração do negócio; nunca para valor zero, multas ou sinal sem atendimento.
- **Valor da nota**: o efetivamente pago pelo serviço, depois de descontos e resgates.
- **Uma nota válida** por atendimento (ou venda de pacote), salvo combo com códigos de serviço diferentes.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| CPF e nome do consumidor na nota | Pessoal, cifrado | Obrigação legal (art. 7, II) | 5 anos (guarda fiscal) | Equipe com permissão de NFS-e (CPF mascarado na tela); o próprio consumidor |
| Certificado digital e senha | Credencial, cifrada | Execução de contrato | Até a troca ou o fim do contrato | Ninguém em claro; uso só pelo adaptador fiscal |
| Dados do emitente pessoa física (CPF, endereço) | Pessoal, cifrado | Obrigação legal; execução de contrato | Contrato + 5 anos | Proprietário; Financeiro/Ops |
| XMLs e PDFs das notas | Pessoal (tomador) | Obrigação legal | 5 anos | Proprietário; Financeiro/Ops; o próprio consumidor (a nota dele) |

Regras: a descrição do serviço na nota nunca inclui observação do consumidor nem dado de saúde além do nome do serviço; serviços marcados como "discretos" (REQ-NOT-033) usam uma descrição genérica configurada pelo Proprietário; a guarda fiscal prevalece sobre o pedido de eliminação (spec 022, `[C4]`).

---

## Permissões

Recorte da matriz RBAC (DF 7, "Emitir NFS-e"):

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Fin/Ops |
|---|---|---|---|---|---|---|
| Configurar emitente, certificado e dados fiscais | — | — | — | — | ✔ | — |
| Emitir, cancelar e reemitir manualmente | — | — | ✔ filial | ✔ filial | ✔ | ✔ |
| Ver histórico e exportar | — | — | ✔ filial (sem exportar) | ✔ filial | ✔ | ✔ |
| Ver e baixar a própria nota | ✔ | — | — | — | — | — |

O Suporte em sessão de suporte não emite nem cancela notas e não acessa o certificado.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `fiscal.invoice.requested.v1` / `.authorized.v1` / `.rejected.v1` / `.cancelled.v1` | Ciclo da nota |
| `fiscal.invoice.pending.v1` | Pendência fiscal registrada |
| `fiscal.certificate.uploaded.v1` / `.expiring.v1` / `.expired.v1` | Certificado |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| % de atendimentos concluídos e pagos com nota emitida | DF 3.2.12 | Acompanhada; acima de 95% nos negócios com perfil fiscal completo |
| Tempo do atendimento pago à nota autorizada (mediana) | J7 | Até 10 min |
| Taxa de recusa por motivo e por município | REQ-FIS-021 | Acompanhada |
| Notas pendentes há mais de 24 horas | REQ-FIS-023 | 0 |
| Tempo de fechamento fiscal do mês (exportação pronta) | DF 3.2.5 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em negócios com perfil fiscal completo, 95% dos atendimentos concluídos e pagos têm nota autorizada em até 10 minutos.
- **SC-002**: Nenhuma nota é emitida em duplicidade, em 100% dos testes de reenvio e de falha da prefeitura.
- **SC-003**: Nenhuma nota é perdida quando a prefeitura fica fora do ar por até 72 horas.
- **SC-004**: O Proprietário configura o perfil fiscal, o certificado e os dados fiscais de 10 serviços em até 15 minutos.
- **SC-005**: O consumidor encontra a nota do atendimento no app ou na web em até 2 toques.
- **SC-006**: O contador recebe a exportação do mês, completa, em um único arquivo.
- **SC-007**: A senha do certificado nunca aparece em tela, log ou evento, verificado por varredura.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-21** — emitente: tenant com certificado próprio ou Koovela | Modelo fiscal, onboarding, responsabilidade jurídica, CONST 5 | **Resolvido (clarify 2026-11-25)**: configurável; "nota pela Koovela" atrás de flag até parecer e revisão da CONST 5 |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-24** — momento da nota de vale-presente e pacotes para presente | Spec 029 | Esta spec já deixa o momento configurável (venda ou uso) |
| **PEN-07** — pacotes na v1.0 | Spec 006 | Se os pacotes ficarem para a fase 2, a regra de pacote só vale lá |
| **PEN-09** — taxa da Koovela | Spec 012 e 019 | Não afeta a nota do serviço ao consumidor |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Cobertura | ASSUMIDO: prefeitura de São Paulo na v1.0; padrão nacional se o plano confirmar a cobertura |
| Pessoa física sem CNPJ | ASSUMIDO: sem NFS-e; só recibo não fiscal |
| Pacotes | DECIDIDO (PEN-24, 2026-11-25): nota a cada sessão concluída, por padrão; "na venda" configurável; validar com contador |
| Novas tentativas | ASSUMIDO: até 72 horas, em intervalos crescentes |
| Custo da emissão | ASSUMIDO: se o meio de emissão tiver custo por nota, é custo do produto, fora da regra de custo zero da spec 001 |

---

## Fora do escopo desta especificação

- Nota da Koovela ao tenant pela assinatura e pelas taxas (spec 019).
- Recibo da Receita Federal para profissionais de saúde pessoa física.
- Apuração e pagamento de ISS, guias e declarações; escrituração e contabilidade (escopo negativo, CONST 2).
- Nota fiscal de produto (venda de produto físico, escopo negativo).
- Municípios além dos cobertos pelo meio de emissão escolhido no plano.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: nota em até 10 minutos (mediana); novas tentativas por até 72 horas; aviso de pendência após 24 horas; aviso de certificado 30 dias antes; configuração em até 15 minutos; guarda de 5 anos.
- Os prazos de cancelamento e as regras de tomador sem CPF são os da prefeitura vigentes na data; o adaptador fiscal os aplica.
- O leiaute da nota acompanha a reforma tributária (IBS e CBS) pelo adaptador, sem mudar as regras de negócio desta spec.
- O domínio dono desta spec é `fiscal` (CONST 4.4).
