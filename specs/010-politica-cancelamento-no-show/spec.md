# Feature Specification: Política de cancelamento e no-show

**Feature Branch**: `010-politica-cancelamento-no-show`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "010 politica-cancelamento-no-show — seguir a sequência da constituição (seção 10): versionamento da política e J6. Depende de 009. Pendências PEN-13 e PEN-15. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: painel do cliente ("Política de no-show"; agenda e ficha do agendamento) · app do consumidor e web do consumidor ("Resumo e política de cancelamento", "Remarcar e cancelar", "Meus agendamentos") · app do colaborador e `/pro` (aviso de política no detalhe do atendimento)

**Depende de**: 009 `agendamento-ciclo-de-vida` (e, por ela, 002 a 008); a cobrança efetiva usa a spec 012

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, III, V, VI, XI, seções 5, 7, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.1.7, 3.2.3, 3.2.8, 6, 7, 8 (J1, J2, J6), 9.1, 9.3, 9.8, 10.1, 10.3 e 18 (`[PEN-13]`, `[PEN-15]`, `[C1]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O no-show é **a dor com maior disposição a pagar** do segmento, porque tem perda financeira direta e quantificável (DF 3.2.8). É o principal gancho comercial da Koovela.

A política de cancelamento e no-show é configurável por tenant: janela de cancelamento gratuito, percentual de multa, exigência de sinal e exceções (DF 10.3). A regra que vale é a do momento do agendamento, por isso ela é **versionada e congelada** no agendamento (CONST III).

A J6 (DF 8) descreve o fluxo: política vigente no momento do agendamento → falta ou cancelamento tardio → aplicação automática da multa → comunicação → reposição do horário pela J2 (spec 014).

Duas decisões ainda estão abertas no Documento Fundamental e definem o desenho financeiro da política: **quando o sinal é exigido** (`[PEN-15]`) e **como a multa é efetivada** (`[PEN-13]`).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.2.8 | Reduzir no-show | Taxa de no-show; receita perdida |
| 3.1.7 | Não esquecer o compromisso | No-show com e sem lembrete (com a spec 011) |
| 3.2.3 | Preencher horários vagos | Horários liberados por cancelamento repostos (com a spec 014) |
| 3.1.6 | Remarcar sem telefonema | % de remarcações no app (em vez de falta) |

Personas: Proprietário (configura); Recepção, Gerente e Colaborador (aplicam, abonam, registram); consumidor (aceita, cancela, contesta).

---

## Clarifications

### Session 2026-11-25

- Q: Como ficam os casos-limite da multa com a forma parametrizável? → A: A multa por retenção do sinal é limitada ao valor do sinal; sem cartão salvo, a forma "sinal + cartão" cai para registro de multa pendente.
- Q: Quando o sinal é exigido do consumidor? (PEN-15) → A: Opcional por serviço: o estabelecimento escolhe, por serviço, entre sem sinal, sinal para todos ou sinal só para consumidor novo ou com faltas recentes. Em saúde vale a taxa de agendamento fixa (PEN-06, spec 005).
- Q: Como a multa de cancelamento tardio ou falta é cobrada? (PEN-13) → A: Parametrizável pelo cliente e pelo back-office: o back-office define as formas permitidas (reter o sinal ou a taxa de agendamento; reter o sinal e cobrar a diferença no cartão salvo com autorização prévia; só registrar a falta) e o estabelecimento escolhe a sua na política.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar a política do negócio (Priority: P1)

Como Proprietário, quero definir a janela de cancelamento gratuito, as multas de cancelamento tardio e de não comparecimento, o sinal e as exceções, partindo de um modelo sugerido pela minha vertical, e ver um exemplo do que o consumidor vai ler.

**Why this priority**: sem política configurada não há regra para aplicar; é a tela "Política de no-show" do painel (DF 9.3).

**Independent Test**: configurar uma política com cancelamento gratuito até 24 horas antes, multa de 50% no cancelamento tardio e 100% no não comparecimento, e conferir a pré-visualização do texto para o consumidor.

**Acceptance Scenarios**:

1. **Given** um negócio novo, **When** o Proprietário abre "Política de no-show", **Then** vê o modelo sugerido da vertical (beleza: cancelamento gratuito até 2 horas antes, sem multa, sem sinal; saúde: até 24 horas antes, sem multa, sem sinal) já ativo, e pode alterá-lo.
2. **Given** a tela de política, **When** o Proprietário define: janela de cancelamento gratuito (0 a 168 horas), janela de remarcação gratuita (0 a 168 horas), limite de remarcações por agendamento (0 a 5, ou sem limite), multa de cancelamento tardio (0% a 100% do preço), multa de não comparecimento (0% a 100% do preço) e tolerância de atraso (5 a 60 minutos), **Then** a política é salva como nova versão.
3. **Given** a configuração do sinal, **When** o Proprietário define quando ele é exigido, **Then** escolhe, por serviço: sem sinal, sinal para todos, ou sinal só para consumidor novo no negócio ou com falta nos últimos 90 dias (`[PEN-15]` resolvido); em saúde, no lugar do sinal, vale a taxa de agendamento fixa (spec 005, REQ-NEG-052).
4. **Given** o sinal ligado, **When** configurado, **Then** tem valor (percentual de 10% a 100% do preço, ou valor fixo em reais) e prazo para pagar (5 a 30 minutos, limitado pela reserva temporária da spec 008).
5. **Given** a política, **When** o Proprietário define exceções, **Then** pode isentar serviços específicos (por exemplo, avaliação gratuita) e consumidores específicos (lista de isentos) de multa e de sinal.
6. **Given** qualquer mudança, **When** salva, **Then** a tela mostra o texto exato que o consumidor vai ver, em linguagem simples, com um exemplo em reais.
7. **Given** uma regra opcional "exigir sinal depois de N faltas" (N de 1 a 5), **When** ligada, **Then** consumidores com N ou mais não comparecimentos naquele negócio passam a ter sinal exigido, mesmo em serviços sem sinal.

---

### User Story 2 - Consumidor vê e aceita a política antes de agendar (Priority: P1)

Como consumidor, quero saber, antes de confirmar, até quando posso cancelar sem custo e quanto pago se cancelar tarde ou faltar, e ter isso registrado.

**Why this priority**: multa sem aviso claro e aceite registrado é cláusula abusiva (Código de Defesa do Consumidor) e gera disputa; a política só vale se o consumidor a viu.

**Independent Test**: agendar pela web, conferir o texto da política no resumo com datas e valores calculados para aquele agendamento, confirmar e verificar o registro do aceite.

**Acceptance Scenarios**:

1. **Given** o resumo do agendamento (spec 009), **When** exibido, **Then** mostra a política daquele agendamento com datas e valores calculados: "cancele grátis até sexta, 14h"; "depois disso, multa de R$ 40,00"; "se faltar, multa de R$ 80,00"; e, se houver, "sinal de R$ 20,00 agora, descontado do valor final".
2. **Given** o resumo, **When** o consumidor confirma, **Then** o aceite da política fica registrado com a versão, o hash do texto exibido, o IP, o aparelho e o horário (CONST 5).
3. **Given** um agendamento confirmado, **When** o consumidor o abre em "Meus agendamentos", **Then** vê a política congelada e a data-limite de cancelamento gratuito.
4. **Given** uma política sem multa e sem sinal, **When** exibida, **Then** o texto diz apenas até quando cancelar ou remarcar pelo app.
5. **Given** um agendamento manual feito pela Recepção (spec 009), **When** confirmado, **Then** a política é enviada ao consumidor no aviso do agendamento (spec 011), e o aceite é registrado quando ele abrir o agendamento ou, se não abrir, a multa só pode ser aplicada se o estabelecimento confirmar que informou a política presencialmente ou por telefone.

---

### User Story 3 - Cancelamento e remarcação seguem a política congelada (Priority: P1)

Como consumidor, quero cancelar ou remarcar dentro das regras que aceitei; como estabelecimento, quero que as regras sejam aplicadas sem eu precisar calcular nada.

**Why this priority**: é o primeiro ramo da J6 (cancelamento tardio) e o que a spec 009 pede para mostrar antes de cada ação.

**Independent Test**: com política de 24 horas e multa de 50%, cancelar um agendamento com 30 horas de antecedência (sem multa) e outro com 3 horas (multa de 50%); remarcar um terceiro além do limite de remarcações (recusado).

**Acceptance Scenarios**:

1. **Given** um agendamento e sua política congelada, **When** o consumidor cancela antes do fim da janela gratuita, **Then** não há multa e qualquer sinal é devolvido integralmente (spec 012).
2. **Given** a janela gratuita encerrada, **When** o consumidor cancela, **Then** vê o valor da multa antes de confirmar, e, ao confirmar, a multa é aplicada pela forma escolhida pelo estabelecimento entre as permitidas pelo back-office: reter o sinal (ou a taxa de agendamento); reter o sinal e cobrar a diferença no cartão salvo, só se o consumidor autorizou antes; ou só registrar a falta (`[PEN-13]` resolvido).
3. **Given** a janela de remarcação gratuita encerrada ou o limite de remarcações atingido, **When** o consumidor tenta remarcar, **Then** vê a regra e a opção de cancelar com a consequência da política, ou de falar com o estabelecimento.
4. **Given** um agendamento remarcado (spec 009), **When** cancelado depois, **Then** vale a política congelada do agendamento original, e a janela gratuita conta a partir do novo horário.
5. **Given** um cancelamento pelo estabelecimento, **When** acontece, **Then** nenhuma multa é aplicada e todo valor pago é devolvido (REQ-AGE-032).
6. **Given** a regra "o consumidor não pode cancelar pelo app depois da janela" (opção do Proprietário, padrão: pode, com multa), **When** ligada, **Then** fora da janela o app mostra só o contato do estabelecimento.

---

### User Story 4 - Não comparecimento com multa automática e comunicação (Priority: P1)

Como estabelecimento, quero que, ao marcar um não comparecimento, a multa da política seja aplicada automaticamente e o consumidor seja avisado, e que o horário perdido seja oferecido a quem está na fila (J6).

**Why this priority**: é o núcleo da J6 e do gancho comercial (DF 3.2.8).

**Independent Test**: com política de multa de 100% no não comparecimento, marcar `NO_SHOW` num agendamento de teste e conferir: multa aplicada, consumidor avisado, contador de faltas do consumidor naquele negócio incrementado.

**Acceptance Scenarios**:

1. **Given** um agendamento `CONFIRMADO` sem check-in, **When** passa a tolerância de atraso da política congelada, **Then** a equipe pode marcar `NO_SHOW` (REQ-AGE-060), e a ação mostra o valor da multa que será aplicada.
2. **Given** a marcação de `NO_SHOW`, **When** confirmada, **Then** a multa é aplicada pela forma definida no `[PEN-13]`, o consumidor é avisado (spec 011) com o valor e o motivo, e o contador de faltas do consumidor naquele negócio aumenta em 1.
3. **Given** um cancelamento tardio ou um não comparecimento em horário ainda futuro (cancelamento tardio), **When** registrado, **Then** um evento oferece o horário à fila de espera e ao horário ocioso (spec 014, J2).
4. **Given** o consumidor isento (lista de exceções) ou o serviço isento, **When** o não comparecimento é marcado, **Then** a falta é contada, mas nenhuma multa é aplicada.
5. **Given** um não comparecimento corrigido pela equipe em até 48 horas (REQ-AGE-062), **When** corrigido, **Then** a multa é revertida (estorno pela spec 012), o contador volta, e o consumidor é avisado.

---

### User Story 5 - Abonar e contestar (Priority: P2)

Como Recepção ou Gerente, quero abonar a multa de um consumidor com motivo; como consumidor, quero contestar uma multa pelo app.

**Why this priority**: imprevistos acontecem; sem abono e contestação, a multa vira atrito com o consumidor e chamado de suporte.

**Independent Test**: aplicar uma multa, abonar com motivo pela Recepção e conferir o estorno; em outro caso, contestar pelo app e conferir a fila de contestações no painel.

**Acceptance Scenarios**:

1. **Given** uma multa aplicada, **When** a Recepção, o Gerente ou o Proprietário a abona com motivo, **Then** ela é revertida (spec 012), o abono fica registrado com ator e motivo na trilha de auditoria (spec 004), e o consumidor é avisado.
2. **Given** uma multa aplicada há até 7 dias, **When** o consumidor contesta pelo app com um texto (até 500 caracteres), **Then** a contestação aparece no painel da filial para decisão; a multa fica suspensa enquanto não houver decisão, se ainda não tiver sido cobrada.
3. **Given** uma contestação, **When** a equipe decide, **Then** aceita (multa revertida) ou recusa (com resposta ao consumidor); sem decisão em 7 dias, a contestação é aceita automaticamente.
4. **Given** o abono, **When** aplicado a uma falta, **Then** o Proprietário escolhe se a falta também deixa de contar para a regra "sinal depois de N faltas".

---

### User Story 6 - Política versionada e transparente (Priority: P2)

Como Proprietário, quero mudar a política sem afetar quem já agendou, e ver o histórico de versões.

**Why this priority**: CONST III; trocar a regra no meio do caminho é motivo de disputa.

**Independent Test**: com agendamentos feitos na versão 1, publicar a versão 2 com multa maior, e conferir que os antigos mantêm a versão 1 e os novos usam a 2.

**Acceptance Scenarios**:

1. **Given** uma mudança na política, **When** salva, **Then** cria uma nova versão com vigência imediata ou futura, e os agendamentos existentes mantêm a versão congelada (REQ-AGE-015).
2. **Given** o histórico, **When** o Proprietário o abre, **Then** vê cada versão com o texto exibido ao consumidor, autor e data.
3. **Given** uma mudança de política, **When** salva, **Then** é registrada na trilha de auditoria (spec 004, categoria administrativa de tenant).

---

### Edge Cases

- **Não comparecimento com sinal maior que a multa**: retém-se só o valor da multa; o resto do sinal é devolvido.
- **Multa maior que o valor pago (sinal)**: se a forma escolhida for "retida do sinal", a multa é limitada ao valor do sinal.
- **Agendamento com pacote de sessões** (spec 006): a multa de não comparecimento é o consumo da sessão; não há cobrança em dinheiro, salvo se a política disser o contrário.
- **Combo**: multa calculada sobre o preço do combo.
- **Preço "a partir de"**: multa calculada sobre o valor mínimo.
- **Atraso do consumidor dentro da tolerância**: o atendimento acontece; se o atraso impedir o serviço completo, a equipe decide reduzir o serviço ou remarcar; não há multa automática por atraso.
- **Cancelamento por motivo de força maior** (por exemplo, enchente, greve de transporte): a equipe abona; a plataforma não detecta automaticamente.
- **Estabelecimento atrasado ou ausente**: o consumidor pode registrar "o estabelecimento não me atendeu" pelo app em até 48 horas; isso abre contestação e impede multa.
- **Mudança de fuso ou horário de verão**: a data-limite de cancelamento é calculada no fuso da filial e exibida com a data e a hora exatas.
- **Consumidor sem cartão salvo e multa por cartão**: sem forma de cobrança, a multa fica registrada como pendente e conta para a regra de sinal.
- **Saúde** (PEN-06, REQ-NEG-052): a única consequência de falta ou cancelamento tardio é reter a taxa de agendamento, informada e aceita no agendamento; não há multa percentual nem cobrança extra no cartão. A política não pode impedir o consumidor de cancelar.

---

## Requirements *(mandatory)*

Formato: `REQ-POL-NNN (origem: …)`.

### Functional Requirements

**Configuração**

- **REQ-POL-001** (origem: DF 10.3): A política DEVE ser configurável por negócio, com: janela de cancelamento gratuito (0 a 168 h), janela de remarcação gratuita (0 a 168 h), limite de remarcações (0 a 5 ou sem limite), multa de cancelamento tardio (0% a 100% do preço), multa de não comparecimento (0% a 100% do preço), tolerância de atraso (5 a 60 min) e opção de impedir cancelamento pelo app fora da janela.
- **REQ-POL-002** (origem: DF 4 | DF 10.3): Cada vertical DEVE ter um modelo sugerido, ativo por padrão no negócio novo (beleza: 2 h, sem multa, sem sinal; saúde: 24 h, taxa de agendamento do negócio no lugar do sinal, sem multa percentual).
- **REQ-POL-003** (origem: PEN-15 | DF 10.3): O sinal DEVE ser opcional por serviço, com os modos "sem sinal", "sinal para todos" e "sinal só para consumidor novo ou com falta nos últimos 90 dias"; em saúde, a taxa de agendamento fixa (REQ-NEG-052) substitui o sinal, é abatida do valor do atendimento, devolvida no cancelamento dentro da janela gratuita e retida na falta ou no cancelamento tardio.
- **REQ-POL-004** (origem: DF 10.3): O sinal DEVE ter valor percentual (10% a 100%) ou fixo, e prazo de pagamento de 5 a 30 minutos, limitado pela reserva temporária (REQ-AGD-031); o sinal é descontado do valor final do atendimento.
- **REQ-POL-005** (origem: DF 10.3 "exceções"): A política DEVE aceitar exceções por serviço e por consumidor (lista de isentos), para multa e para sinal.
- **REQ-POL-006** (origem: DF 3.2.8): A regra opcional "exigir sinal depois de N faltas" (N de 1 a 5) DEVE usar o contador de não comparecimentos do consumidor naquele negócio.
- **REQ-POL-007** (origem: CONST XI): A tela DEVE mostrar a pré-visualização do texto ao consumidor, com exemplo em reais, antes de salvar.

**Versionamento e aceite**

- **REQ-POL-010** (origem: CONST III | DF 10.3): Toda mudança DEVE criar nova versão com vigência imediata ou futura; o agendamento congela a versão vigente na criação (REQ-AGE-015); remarcações mantêm a versão do original (REQ-AGE-030).
- **REQ-POL-011** (origem: CONST 5 | CDC): O resumo do agendamento DEVE mostrar a política com datas e valores calculados para aquele agendamento, e a confirmação DEVE registrar o aceite com versão, hash do texto exibido, IP, aparelho e horário.
- **REQ-POL-012** (origem: CDC | J6): No agendamento manual, a política DEVE ir no aviso ao consumidor; a multa só PODE ser aplicada se houver aceite registrado ou confirmação da equipe de que informou a política ao consumidor.
- **REQ-POL-013** (origem: CONST V | REQ-AUD-001): Mudanças de política DEVEM gerar registro na trilha de auditoria.

**Aplicação**

- **REQ-POL-020** (origem: DF 10.3 | REQ-AGE-031): A política DEVE fornecer por contrato, para um agendamento e um instante, o que é permitido (cancelar, remarcar) e a consequência (sem custo, multa com valor, devolução do sinal), usado pela spec 009 antes de cada ação.
- **REQ-POL-021** (origem: J6): Cancelamento antes da janela gratuita NÃO DEVE gerar multa, e o sinal DEVE ser devolvido integralmente.
- **REQ-POL-022** (origem: J6 | PEN-13): Cancelamento tardio e não comparecimento DEVEM aplicar a multa da política congelada, pela forma escolhida pelo estabelecimento entre as permitidas pelo back-office (reter sinal ou taxa de agendamento; reter sinal e cobrar a diferença no cartão salvo com autorização prévia; só registrar); a forma fica congelada na política do agendamento. Nas verticais de saúde, a consequência é só reter a taxa de agendamento (REQ-POL-003), sem multa percentual nem cobrança no cartão. A execução financeira é da spec 012.
- **REQ-POL-023** (origem: CONST III): A multa DEVE ser calculada em centavos inteiros sobre o preço congelado (o mínimo, no preço "a partir de"; o preço do combo, no combo), arredondada para baixo.
- **REQ-POL-024** (origem: edge case): Com sinal maior que a multa, DEVE ser retido só o valor da multa e devolvido o resto.
- **REQ-POL-025** (origem: REQ-CAT-045): Em agendamento coberto por pacote, a consequência padrão do não comparecimento DEVE ser o consumo da sessão, sem cobrança em dinheiro.
- **REQ-POL-026** (origem: REQ-AGE-032): Cancelamento pelo estabelecimento NUNCA DEVE gerar multa.
- **REQ-POL-027** (origem: J6 | DF 3.1.7): Toda multa aplicada, revertida ou abonada DEVE gerar aviso ao consumidor (spec 011), com valor e motivo.
- **REQ-POL-028** (origem: J6 | J2): Cancelamento tardio de horário futuro DEVE publicar evento para a fila de espera e o horário ocioso (spec 014).
- **REQ-POL-029** (origem: DF 3.2.8): DEVE existir contador de não comparecimentos por consumidor e negócio, visível à equipe do negócio, nunca a outros negócios.

**Abono e contestação**

- **REQ-POL-030** (origem: DF 7 "conceder desconto"): Recepção, Gerente e Proprietário DEVEM poder abonar multa com motivo; o abono é registrado na trilha de auditoria e revertido pela spec 012.
- **REQ-POL-031** (origem: CDC | J6): O consumidor DEVE poder contestar multa em até 7 dias e registrar "o estabelecimento não me atendeu" em até 48 horas; a contestação vai ao painel da filial.
- **REQ-POL-032** (origem: CDC): Contestação sem decisão em 7 dias DEVE ser aceita automaticamente; enquanto pendente, a multa ainda não cobrada fica suspensa.
- **REQ-POL-033** (origem: REQ-AGE-062): A correção de não comparecimento DEVE reverter multa e contador.

**Contratos e eventos**

- **REQ-POL-040** (origem: CONST VII): A política DEVE publicar contratos de consulta (versão vigente, versão por identificador, consequência para um agendamento num instante) e eventos de multa, abono, contestação e reversão.
- **REQ-POL-041** (origem: CONST II): Política, contadores e contestações DEVEM ficar no espaço de dados do tenant.

### Key Entities

- **Política** (`no_show_policy`, versionada): negócio, janelas, limites, multas, tolerância, modo e valor do sinal, regra de N faltas, opção de impedir cancelamento pelo app, vigência, texto exibido, autor.
- **Exceção da política**: política, tipo (serviço ou consumidor), alvo, abrangência (multa, sinal).
- **Aceite da política**: agendamento, versão, hash do texto, IP, aparelho, horário, ou confirmação da equipe (no agendamento manual).
- **Multa**: agendamento, tipo (cancelamento tardio ou não comparecimento), valor, forma (conforme `[PEN-13]`), estado (aplicada, suspensa, cobrada, revertida, abonada).
- **Contador de faltas**: consumidor, negócio, quantidade, últimas datas.
- **Contestação**: multa ou agendamento, texto, abertura, decisão, resposta, ator.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (DF 9.3) | Política de no-show | Código do Figma registrado no plano |
| Painel (DF 9.3) | Agenda do dia (multa, abono e contestação no detalhe do agendamento) | Registrado no plano |
| App do consumidor (DF 9.1) | Resumo e política de cancelamento · Remarcar e cancelar (consequência) | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Resumo e política · Remarcar e cancelar (janela) | `W..` registrados no plano |

A contestação pelo consumidor e a fila de contestações no painel não aparecem no protótipo; precisam de telas novas.

---

## Regras e estados

- **Consequência de cancelamento pelo consumidor**: antes da janela gratuita → sem custo, sinal devolvido; depois → multa de cancelamento tardio (ou bloqueio pelo app, se configurado).
- **Consequência do não comparecimento**: multa de não comparecimento; em pacote, consumo da sessão; consumidor ou serviço isento → só contagem.
- **Multa**: `aplicada` → `cobrada` | `suspensa` (contestação) → `cobrada` | `revertida`; `aplicada` ou `cobrada` → `abonada` (com estorno) | `revertida` (correção de não comparecimento).
- **Contestação**: `aberta` → `aceita` | `recusada` | `aceita_por_prazo`.
- **Versão da política**: `agendada` → `vigente` → `substituída`.
- **Precedência**: exceção do consumidor > exceção do serviço > regra de N faltas (só para sinal) > política do negócio.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Aceite da política (IP, aparelho) | Pessoal | Exercício regular de direitos (art. 7, VI) | 5 anos após o agendamento | Equipe da filial (sem IP); SRE |
| Contador de faltas do consumidor | Pessoal (comportamento) | Legítimo interesse do estabelecimento (art. 7, IX), informado na política | 12 meses móveis | Equipe do próprio negócio; nunca outros negócios |
| Lista de isentos | Pessoal | Legítimo interesse | Enquanto estiver na lista | Proprietário; Gerente |
| Texto da contestação | Pessoal; pode conter dado sensível | Exercício regular de direitos | 5 anos | Equipe da filial; o próprio consumidor |
| Multas e abonos | Pessoal (financeiro) | Execução de contrato | 5 anos (guarda fiscal) | Equipe da filial; Financeiro/Ops; o próprio consumidor |

Regras: o contador de faltas não é compartilhado entre negócios nem tenants (CONST II); a tela de contestação avisa para não informar dados de saúde.

---

## Permissões

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Fin/Ops | Suporte |
|---|---|---|---|---|---|---|---|
| Configurar política e exceções | — | — | — | — | ✔ | — | ✔* (leitura) |
| Ver política | ✔ (do próprio agendamento) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* |
| Marcar não comparecimento (spec 009) | — | ✔ próprio | ✔ filial | ✔ filial | ✔ | — | — |
| Abonar multa | — | — | ✔ filial | ✔ filial | ✔ | ✔ | — |
| Decidir contestação | — | — | ✔ filial | ✔ filial | ✔ | — | — |
| Contestar multa | ✔ própria | — | — | — | — | — | — |
| Ver contador de faltas | — | ✔ | ✔ filial | ✔ filial | ✔ | — | ✔* |

`✔*` = apenas em sessão de suporte (spec 003). Abonar multa corresponde a "Conceder desconto" na DF 7.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `scheduling.policy.version_published.v1` | Nova versão da política |
| `scheduling.policy.accepted.v1` | Aceite registrado no agendamento |
| `scheduling.penalty.applied.v1` | Multa aplicada (cancelamento tardio ou não comparecimento) |
| `scheduling.penalty.waived.v1` / `.reverted.v1` | Abono ou reversão |
| `scheduling.penalty.disputed.v1` / `.dispute_resolved.v1` | Contestação aberta e decidida |
| `scheduling.slot.released_late.v1` | Horário liberado por cancelamento tardio (para a spec 014) |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Taxa de não comparecimento por negócio | DF 3.2.8 | Acompanhada; queda mês a mês após a adoção |
| Receita perdida por não comparecimento (preço dos atendimentos faltados − multas cobradas) | DF 3.2.8 | Acompanhada |
| No-show com e sem lembrete | CONST 7 · DF 3.1.7 · `[C1]` | Desde o primeiro tenant (com a spec 011) |
| % de cancelamentos feitos dentro da janela gratuita | DF 3.1.6 | Acompanhada |
| % de multas abonadas e % contestadas | J6 | Acompanhada |
| Conversão do checkout com e sem sinal | `[PEN-15]` | Acompanhada |
| Horários liberados tardiamente que foram repostos | DF 3.2.3 | Acompanhada (com a spec 014) |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O Proprietário configura a política do negócio em até 3 minutos, partindo do modelo da vertical.
- **SC-002**: 100% dos agendamentos confirmados pelo consumidor têm aceite registrado com a versão e o texto exato que ele viu.
- **SC-003**: Em 100% dos testes, a consequência exibida antes de cancelar ou remarcar é igual à aplicada depois.
- **SC-004**: Nenhuma mudança de política altera a regra de agendamento já criado.
- **SC-005**: Toda multa aplicada gera aviso ao consumidor em até 5 minutos (com a spec 011).
- **SC-006**: Nenhuma multa é aplicada em cancelamento pelo estabelecimento, nem em consumidor ou serviço isento.
- **SC-007**: Toda contestação recebe decisão (ou é aceita por prazo) em até 7 dias.
- **SC-008**: A taxa de não comparecimento dos tenants que ligam multa ou sinal pode ser comparada à dos que não ligam, a partir do primeiro mês.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-15** — sinal obrigatório, opcional por serviço, ou só de consumidor novo? | Checkout (specs 009 e 012), conversão, no-show | **Resolvido (clarify 2026-11-25)**: opcional por serviço, 3 modos |
| **PEN-13** — multa retida do sinal, cobrada no cartão salvo, ou perdida? | Pagamento (spec 012), suporte, contestação | **Resolvido (clarify 2026-11-25)**: parametrizável pelo cliente e pelo back-office |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **C1** / **PEN-25** | Os avisos de multa e de política usam a spec 011, que nasce multicanal |
| Modelos por vertical | ASSUMIDO: beleza 2 h e saúde 24 h, ambos sem multa e sem sinal |
| Contestação | ASSUMIDO: 7 dias para contestar; aceita automaticamente sem decisão em 7 dias |
| Regra de N faltas | ASSUMIDO: opcional, contador de 12 meses móveis, por negócio |
| Pacote | ASSUMIDO: não comparecimento consome a sessão, sem cobrança em dinheiro |

---

## Fora do escopo desta especificação

- Cobrança, retenção e estorno de valores (spec 012); aqui só a regra e o valor.
- Envio dos avisos (spec 011).
- Reposição do horário pela fila de espera e pelo horário ocioso (spec 014).
- Marcação do não comparecimento e máquina de estados (spec 009).
- Lista de consumidores bloqueados compartilhada entre estabelecimentos (não existe: cada negócio vê só os próprios dados).
- Antifraude de abuso de cancelamento entre negócios (spec 021).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: janelas de 0 a 168 horas; multas de 0% a 100%; tolerância de 5 a 60 minutos; sinal de 10% a 100% com prazo de 5 a 30 minutos; contestação em 7 dias; "não fui atendido" em 48 horas; contador de faltas de 12 meses; configuração em até 3 minutos.
- A multa é limitada ao preço do serviço; não há multa acima de 100%.
- O texto da política exibido ao consumidor é gerado a partir da configuração, não escrito livremente, para garantir que exibido e aplicado sejam iguais.
- O direito do consumidor de cancelar não é removido em nenhum caso; a política só define a consequência (e, se o Proprietário quiser, que o cancelamento fora da janela seja feito com o estabelecimento).
- O domínio dono desta spec é `scheduling` (CONST 4.4); a execução financeira pertence a `payments` (spec 012).
