# Feature Specification: Turmas, planos de aula e check-in

**Feature Branch**: `026-turmas-planos-checkin`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "026 turmas-planos-checkin — seguir a sequência da constituição (seção 10), fase 2: [D30]. Depende de 008 e 012. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 2 (em todas as plataformas, `[D35]`)

**Superfícies afetadas**: app do consumidor ("Turmas do estúdio"; inscrição; QR de check-in; planos e pacotes) · web do consumidor ("Turmas e planos") · painel do cliente ("Turmas: grade e capacidade", "Planos e pacotes de aulas") · app do colaborador e `/pro` ("Check-in da turma")

**Depende de**: 008 `motor-agenda-disponibilidade` · 012 `pagamentos-split` (e, por elas, a v1.0); usa a política da 010, os avisos da 011, as notas da 017 e os atendidos da 025

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I (vaga de turma), III, IX, seções 2, 4.4 (`scheduling`, `commerce`), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 4.2, 4.3, 5.2, 6 (fase 2), 9.10, 14 (fase 2) e 17 (`[D30]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A vertical de bem-estar e fitness (spa, massoterapia, yoga, pilates, personal) trabalha com **turmas**: um instrutor, um horário, várias vagas (DF 4.2). Isso não cabe no modelo 1:1 da v1.0.

A decisão `[D30]` define as regras:

- venda **avulsa** (uma aula), em **pacote** (N aulas com validade) e em **plano mensal recorrente**;
- turma lotada **não tem fila de espera**;
- check-in por **QR** e pela **lista do instrutor**;
- a **presença desconta do plano ou do pacote**;
- o plano mensal é **cobrança recorrente do aluno, com split** (DF 5.2).

A constituição exige lock por **vaga de turma** (CONST I): duas pessoas não podem ficar com a última vaga.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 4.2 | Bem-estar com turma | Tenants e alunos na vertical bem-estar |
| DF 14 (fase 2) | Ocupação das turmas; conversão de plano mensal | Ocupação; conversão |
| DF 5.2 | Plano mensal de aulas com split | Receita recorrente dos alunos |
| 3.2.10 | Provar o que foi feito | % de aulas com check-in |

Personas: aluno (consumidor, ou atendido menor pela spec 025); instrutor (colaborador); Proprietário e Recepção do estúdio.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Montar a grade de turmas (Priority: P1)

Como Proprietário de um estúdio, quero montar a grade semanal de turmas (modalidade, instrutor, sala, horário, vagas), para que os alunos vejam e se inscrevam.

**Why this priority**: sem turma não há inscrição; é a tela "Turmas: grade e capacidade" (DF 9.10).

**Independent Test**: criar a turma "Pilates iniciante, seg e qua 7h, 8 vagas, instrutora Ana, sala 1" e conferir as aulas geradas no calendário das próximas semanas, com as vagas disponíveis.

**Acceptance Scenarios**:

1. **Given** a tela "Turmas", **When** o Proprietário cria uma turma, **Then** informa modalidade (serviço do catálogo, spec 006), nível opcional, instrutor (spec 007), filial, sala (nome), dias da semana e horário, duração, capacidade (2 a 100 vagas), data de início e de fim opcional, e preço da aula avulsa.
2. **Given** a turma, **When** salva, **Then** as aulas são geradas para o horizonte do negócio (spec 008) e ocupam o tempo do instrutor, com proteção contra sobreposição (CONST I).
3. **Given** uma aula específica, **When** o Proprietário a cancela (feriado, falta do instrutor) ou troca o instrutor, **Then** os inscritos são avisados (spec 011); no cancelamento, os créditos voltam e valores pagos são devolvidos (spec 012).
4. **Given** uma mudança na turma (horário, capacidade), **When** salva, **Then** vale para aulas futuras; a capacidade não pode ficar abaixo do número de inscritos de uma aula já com inscrições.
5. **Given** a grade, **When** exibida no painel, **Then** mostra por semana as aulas, os inscritos e as vagas restantes, com filtro por instrutor e sala.

---

### User Story 2 - Aluno se inscreve numa aula sem risco de pegar vaga já ocupada (Priority: P1)

Como aluno, quero ver as turmas do estúdio, escolher a aula e garantir minha vaga, pagando avulso ou usando meu plano ou pacote.

**Why this priority**: telas "Turmas do estúdio" (app) e "Turmas e planos" (web); é a receita do estúdio.

**Independent Test**: numa aula de 8 vagas com 7 inscritos, disparar 3 inscrições simultâneas para a última vaga; só uma é aceita, e as outras recebem "turma lotada".

**Acceptance Scenarios**:

1. **Given** "Turmas do estúdio", **When** o aluno abre, **Then** vê a grade da semana com modalidade, horário, instrutor, nível, vagas restantes e preço avulso.
2. **Given** uma aula com vaga, **When** o aluno se inscreve, **Then** escolhe como pagar: aula avulsa (pagamento pela spec 012), crédito do pacote ou o plano mensal ativo; a vaga é reservada com proteção por vaga (CONST I).
3. **Given** a última vaga disputada por vários alunos ao mesmo tempo, **When** as inscrições chegam, **Then** só uma é aceita; as demais veem "turma lotada".
4. **Given** uma aula lotada, **When** o aluno tenta se inscrever, **Then** vê "turma lotada" e as próximas aulas da mesma modalidade com vaga; não há fila de espera (`[D30]`).
5. **Given** um aluno menor (spec 025), **When** o responsável inscreve, **Then** a inscrição fica no nome do menor e o pagamento e o crédito, do responsável.
6. **Given** a inscrição, **When** confirmada, **Then** o aluno recebe a confirmação (spec 011) e o QR de check-in da aula no app.

---

### User Story 3 - Check-in por QR ou pela lista do instrutor (Priority: P1)

Como instrutor, quero confirmar quem veio, pelo QR do aluno ou marcando na lista, para que a presença desconte do plano ou do pacote e o estúdio saiba quem faltou.

**Why this priority**: `[D30]` ("check-in por QR e lista do instrutor"; "presença desconta do plano ou do pacote"); tela "Check-in da turma" (DF 9.10).

**Independent Test**: numa aula de teste com 5 inscritos, fazer check-in de 2 por QR e 2 pela lista, deixar 1 sem check-in; conferir as presenças, o consumo dos créditos e a falta marcada ao fim da aula.

**Acceptance Scenarios**:

1. **Given** o app do colaborador, **When** o instrutor abre "Check-in da turma", **Then** vê a lista de inscritos da aula, com nome e foto opcional.
2. **Given** o aluno com o QR, **When** o instrutor lê o QR (ou o aluno lê o QR afixado no estúdio, se o estúdio usar esse modo), **Then** a presença é registrada, de 30 minutos antes até 15 minutos depois do início.
3. **Given** a lista, **When** o instrutor marca presença manualmente, **Then** a presença é registrada com o instrutor como ator.
4. **Given** a presença, **When** registrada, **Then** o crédito do pacote ou o uso do plano é consumido (livro-razão da spec 012).
5. **Given** o fim da aula, **When** um inscrito não tem presença, **Then** é marcado como falta e segue a política do negócio (spec 010): o crédito é consumido ou devolvido conforme a regra configurada.
6. **Given** um aluno que chega sem inscrição e há vaga, **When** o instrutor o adiciona na lista, **Then** a inscrição e a presença são registradas juntas, com o pagamento pela forma escolhida.
7. **Given** o check-in sem rede, **When** a conexão volta, **Then** as presenças são enviadas, como na spec 009.

---

### User Story 4 - Pacotes de aulas (Priority: P2)

Como Proprietário, quero vender pacotes de N aulas com validade; como aluno, quero comprar e ver quantas aulas restam.

**Why this priority**: forma de venda da `[D30]`; tela "Planos e pacotes de aulas" (DF 9.10).

**Independent Test**: criar um pacote de 10 aulas com validade de 60 dias; comprar, inscrever-se em 3 aulas, ir em 2, faltar em 1 e conferir o saldo.

**Acceptance Scenarios**:

1. **Given** "Planos e pacotes de aulas", **When** o Proprietário cria um pacote, **Then** define número de aulas (2 a 100), modalidades aceitas, preço, validade (7 a 365 dias) e regra de devolução (como na spec 006).
2. **Given** a compra, **When** paga (spec 012), **Then** os créditos entram no livro-razão do aluno; a inscrição reserva um crédito e a presença o consome.
3. **Given** o saldo, **When** o aluno abre o app, **Then** vê créditos disponíveis, reservados, usados e a validade.
4. **Given** créditos a 7 dias de vencer, **When** o prazo chega, **Then** o aluno é avisado (spec 011).

---

### User Story 5 - Plano mensal recorrente (Priority: P2)

Como Proprietário, quero vender planos mensais (por exemplo, "2 aulas por semana" ou "ilimitado"), cobrados todo mês no cartão do aluno, com split; como aluno, quero assinar e cancelar quando quiser.

**Why this priority**: "plano mensal recorrente" da `[D30]` e fonte de receita da DF 5.2; é a principal forma de venda de estúdios.

**Independent Test**: criar o plano "2 aulas por semana, R$ 200"; assinar com cartão de teste; inscrever-se em 2 aulas na semana (aceito) e numa terceira (recusado); simular falha de cobrança no mês seguinte e conferir a régua do aluno; cancelar e conferir o fim no ciclo.

**Acceptance Scenarios**:

1. **Given** "Planos e pacotes de aulas", **When** o Proprietário cria um plano, **Then** define nome, modalidades aceitas, limite (N aulas por semana, N por mês ou ilimitado), preço mensal, e se há fidelidade mínima (padrão: não).
2. **Given** um plano, **When** o aluno assina, **Then** o cartão é cobrado no ato e depois todo mês no mesmo dia, com split (spec 012) e nota fiscal (spec 017) a cada cobrança.
3. **Given** o limite do plano, **When** o aluno se inscreve além dele, **Then** a inscrição é recusada com a opção de pagar a aula avulsa.
4. **Given** uma cobrança recusada, **When** acontece, **Then** o cartão é tentado de novo nos dias 1, 3 e 5, o aluno é avisado, e no dia 7 o plano fica suspenso (sem novas inscrições pelo plano) até o pagamento; inscrições já feitas continuam.
5. **Given** o aluno, **When** cancela o plano, **Then** o plano vale até o fim do ciclo pago, sem multa (salvo fidelidade mínima aceita na assinatura, exibida antes).
6. **Given** uma mudança de preço do plano, **When** publicada, **Then** vale para assinantes atuais só a partir do ciclo seguinte a 30 dias de aviso.

---

### Edge Cases

- **Sala com duas turmas no mesmo horário**: na fase 2, a sala é só um nome (recurso compartilhado está adiado, `[PEN-23]`); o painel avisa a sobreposição de sala, mas não bloqueia; o instrutor é protegido pela spec 008.
- **Instrutor que falta**: a aula é cancelada ou o instrutor é trocado (História 1, cenário 3).
- **Aluno com plano e pacote**: na inscrição, escolhe qual usar; o padrão é o plano.
- **Pacote vencido com inscrição futura**: a inscrição exige crédito válido na data da aula; créditos que vencem antes da aula não podem ser usados nela.
- **Aula cancelada pelo estúdio**: créditos devolvidos, uso do plano devolvido no limite semanal, avulso estornado.
- **Comissão do instrutor**: configurável por turma entre valor fixo por aula dada e percentual por presença (base: preço avulso, preço por aula do pacote, ou plano dividido pelas aulas usadas no ciclo), usando o contrato da spec 007.
- **Personal trainer** (1:1): continua no modelo de serviço da v1.0, não de turma.
- **Menor como aluno**: a inscrição exige responsável (spec 025); o QR fica no app do responsável.
- **Tenant suspenso** (spec 019): os planos dos alunos ficam pausados, sem cobrança, e os alunos são avisados.

---

## Requirements *(mandatory)*

Formato: `REQ-TUR-NNN (origem: …)`.

### Functional Requirements

**Turmas e aulas**

- **REQ-TUR-001** (origem: D30 | DF 6 `Turma`): A turma (`class_session` em série) DEVE ter modalidade (serviço do catálogo), nível opcional, instrutor, filial, sala (nome), dias e horário, duração, capacidade (2 a 100), início, fim opcional e preço avulso.
- **REQ-TUR-002** (origem: CONST I | REQ-AGD-062): As aulas DEVEM ser geradas até o horizonte do negócio e ocupar o tempo do instrutor com a proteção da spec 008; cada aula tem capacidade N.
- **REQ-TUR-003** (origem: D30): O Proprietário DEVE poder cancelar uma aula ou trocar o instrutor dela, com aviso aos inscritos, devolução de créditos e estorno de avulsos.
- **REQ-TUR-004** (origem: CONST III): Mudanças na turma valem para aulas futuras; a capacidade não pode ficar abaixo dos inscritos de uma aula.
- **REQ-TUR-005** (origem: PEN-23): A sala é só um nome; sobreposição de sala gera aviso, sem bloqueio, até o recurso compartilhado existir.

**Inscrição**

- **REQ-TUR-010** (origem: CONST I): A inscrição DEVE reservar uma vaga com lock por vaga e regra no banco; inscrições simultâneas na última vaga DEVEM resultar em exatamente uma aceita.
- **REQ-TUR-011** (origem: D30): Turma lotada NÃO DEVE ter fila de espera; o aluno vê as próximas aulas da mesma modalidade com vaga.
- **REQ-TUR-012** (origem: D30): A inscrição DEVE aceitar pagamento avulso (spec 012), crédito de pacote ou plano ativo; com crédito ou plano, a inscrição reserva e a presença consome.
- **REQ-TUR-013** (origem: D28 | spec 025): A inscrição de menor DEVE ser feita pelo responsável; pagamento e créditos são do responsável.
- **REQ-TUR-014** (origem: REQ-POL-020): Cancelamento da inscrição pelo aluno DEVE seguir a política do negócio (spec 010).
- **REQ-TUR-015** (origem: CONST VIII): O CI DEVE ter teste de concorrência da última vaga como portão de merge.

**Check-in**

- **REQ-TUR-020** (origem: D30 | CONST 8): O check-in DEVE aceitar QR do aluno lido pelo instrutor, QR do estúdio lido pelo aluno (opção do negócio) e marcação manual pelo instrutor, na janela da `classes_policy` (valor inicial: de 30 minutos antes até 15 minutos depois do início; o negócio ajusta dentro dos limites da política).
- **REQ-TUR-021** (origem: D30): A presença DEVE consumir o crédito do pacote ou o uso do plano no livro-razão (spec 012).
- **REQ-TUR-022** (origem: D30 | spec 010): Ao fim da aula, inscritos sem presença DEVEM ser marcados como falta, com a consequência da política do negócio (crédito consumido ou devolvido).
- **REQ-TUR-023** (origem: D30): O instrutor DEVE poder adicionar um aluno sem inscrição se houver vaga, registrando inscrição, pagamento e presença juntos.
- **REQ-TUR-024** (origem: REQ-AGE-052): O check-in sem rede DEVE ser enviado quando a conexão voltar.

**Pacotes de aulas**

- **REQ-TUR-030** (origem: D30 | DF 6 `PacoteAulas`): O pacote de aulas DEVE ter número de aulas (2 a 100), modalidades aceitas, preço, validade (7 a 365 dias) e regra de devolução (no mínimo a da REQ-CAT-044).
- **REQ-TUR-031** (origem: CONST III): Os créditos DEVEM ser movimentados pelo livro-razão da spec 012 e nunca ficar negativos.
- **REQ-TUR-032** (origem: DF 3.1.11): O aluno DEVE ver créditos disponíveis, reservados, usados e validade, e ser avisado 7 dias antes do vencimento.

**Plano mensal**

- **REQ-TUR-040** (origem: D30 | DF 6 `PlanoAulas`): O plano DEVE ter nome, modalidades, limite (N por semana, N por mês ou ilimitado), preço mensal e fidelidade mínima opcional (padrão: sem fidelidade).
- **REQ-TUR-041** (origem: DF 5.2 | D30): A assinatura do aluno DEVE ser cobrada no ato e todo mês no mesmo dia, no cartão salvo, pelo adaptador da spec 012, com split e com nota fiscal a cada cobrança (spec 017).
- **REQ-TUR-042** (origem: D30): Inscrições além do limite do plano DEVEM ser recusadas, com opção de aula avulsa.
- **REQ-TUR-043** (origem: CONST III | CONST 8): A régua do aluno DEVE seguir a `classes_policy` versionada no back-office (valores iniciais: novas tentativas nos dias 1, 3 e 5 e suspensão do uso do plano no dia 7) até o pagamento; inscrições já feitas continuam. Nenhum prazo fica no código.
- **REQ-TUR-044** (origem: CDC): O aluno DEVE poder cancelar a qualquer momento, com efeito no fim do ciclo pago; fidelidade mínima só vale se exibida e aceita na assinatura.
- **REQ-TUR-045** (origem: CONST III): Mudança de preço do plano vale para assinantes atuais só no ciclo seguinte a 30 dias de aviso.
- **REQ-TUR-046** (origem: REQ-ASS-032): Com o tenant suspenso, as cobranças dos planos dos alunos DEVEM ficar pausadas, com aviso aos alunos.

**Comissão, vertical e contratos**

- **REQ-TUR-050** (origem: REQ-EQP-046): A comissão do instrutor DEVE ser configurável por turma (valor fixo por aula dada, ou percentual por presença com base definida no edge case), calculada pelo contrato da spec 007.
- **REQ-TUR-051** (origem: DF 4.2): A vertical bem-estar e fitness DEVE existir, com as categorias spa, massoterapia, yoga, pilates e personal; personal segue o modelo 1:1.
- **REQ-TUR-052** (origem: CONST II): Turmas, inscrições e planos ficam no espaço de dados do tenant; créditos no livro-razão da spec 012; "Meus agendamentos" (spec 009) recebe as inscrições por eventos.

### Key Entities

- **Turma** (série de `class_session`): modalidade, nível, instrutor, filial, sala, dias e horário, duração, capacidade, vigência, preço avulso, regra de comissão.
- **Aula** (`class_session`): turma, data e hora, instrutor, estado (prevista, cancelada, realizada), inscritos, vagas.
- **Inscrição**: aula, aluno (consumidor ou atendido), responsável pagante, origem (avulsa, pacote, plano), estado (inscrito, presente, falta, cancelado).
- **Presença**: inscrição, forma (QR do aluno, QR do estúdio, lista), ator, horário.
- **Pacote de aulas** (`PacoteAulas`, versionado): aulas, modalidades, preço, validade, devolução.
- **Plano de aulas** (`class_plan`, versionado): limite, modalidades, preço, fidelidade.
- **Assinatura do aluno**: aluno, plano e versão, cartão (referência), ciclo, estado, régua.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.10) | Código |
|---|---|---|
| App do consumidor | Turmas do estúdio (inclui inscrição e QR) | Registrado no plano |
| Web do consumidor | Turmas e planos | Registrado no plano |
| Painel do cliente | Turmas: grade e capacidade · Planos e pacotes de aulas | Registrados no plano |
| App do colaborador | Check-in da turma | Registrado no plano |

A gestão da assinatura pelo aluno (cancelar, trocar cartão) e o saldo de créditos precisam ser conferidos no protótipo.

---

## Regras e estados

- **Inscrição**: `inscrito` → `presente` (check-in) | `falta` (fim da aula sem check-in) | `cancelado` (aluno, dentro ou fora da política; ou aula cancelada pelo estúdio).
- **Crédito**: reservado na inscrição → consumido na presença ou na falta (conforme política) → devolvido no cancelamento dentro da política ou na aula cancelada.
- **Assinatura do aluno**: `ativa` → `em_atraso` → `suspensa` (dia 7) → `ativa` (pagamento) · `ativa` → `cancelamento_agendado` → `encerrada`.
- **Limite do plano**: contado por semana (segunda a domingo, data local da filial) ou por ciclo mensal.
- **Lotação**: sem fila de espera (`[D30]`).

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Inscrições e presenças do aluno | Pessoal | Execução de contrato (art. 7, V) | Igual aos agendamentos (spec 009) | O próprio aluno; instrutor da aula; equipe da filial |
| Assinatura do aluno e cobranças | Pessoal (financeiro) | Execução de contrato; obrigação legal | 5 anos | O próprio aluno; Proprietário; Financeiro/Ops |
| QR de check-in | Credencial temporária | Execução de contrato | Até o fim da aula | O próprio aluno |
| Dados do aluno menor | Spec 025 | Consentimento do responsável | Spec 025 | Spec 025 |

Regras: a lista de chamada mostra só nome e foto opcional; o QR só identifica aquela inscrição e expira no fim da aula.

---

## Permissões

| Ação | Aluno | Instrutor | Recepção | Gerente | Proprietário |
|---|---|---|---|---|---|
| Ver grade, inscrever-se, cancelar inscrição, assinar e cancelar plano | ✔ | — | — | — | — |
| Montar e editar turmas; cancelar aula; trocar instrutor | — | — | — | ✔ filial | ✔ |
| Criar pacotes e planos | — | — | — | — | ✔ (só o Proprietário) |
| Fazer check-in; adicionar aluno na hora | — | ✔ (aulas dele) | ✔ filial | ✔ filial | ✔ |
| Inscrever aluno pelo painel | — | — | ✔ filial | ✔ filial | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `scheduling.class.scheduled.v1` / `.cancelled.v1` / `.instructor_changed.v1` | Aulas |
| `scheduling.class_enrollment.created.v1` / `.cancelled.v1` / `.attended.v1` / `.missed.v1` | Inscrições e presença |
| `commerce.class_plan.subscribed.v1` / `.charged.v1` / `.past_due.v1` / `.suspended.v1` / `.cancelled.v1` | Plano do aluno |
| `commerce.class_package.purchased.v1` | Compra de pacote de aulas |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Ocupação das turmas (inscritos / vagas; presentes / vagas) | DF 14 (fase 2) | Acompanhada |
| Conversão para plano mensal (alunos avulsos que assinam) | DF 14 (fase 2) | Acompanhada |
| Uso do saldo de pacotes (aulas usadas / compradas) | DF 14 (fase 2) | Acompanhada |
| % de aulas com check-in registrado | DF 3.2.10 | Acompanhada |
| Inadimplência e cancelamento de planos de alunos | DF 5.2 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de concorrência, a última vaga de uma aula fica com exatamente um aluno.
- **SC-002**: O aluno se inscreve numa aula em até 3 toques a partir da grade.
- **SC-003**: O instrutor registra a presença de uma turma de 10 alunos em até 1 minuto.
- **SC-004**: Nenhum saldo de créditos fica negativo, em 100% dos testes.
- **SC-005**: 100% das cobranças mensais dos planos geram split e nota fiscal.
- **SC-006**: Nenhum aluno é cobrado depois de cancelar o plano, fora do ciclo já pago.
- **SC-007**: O Proprietário monta uma grade de 10 turmas em até 15 minutos.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-23** — recurso compartilhado (sala) | Adiado | Sala só como nome, com aviso de sobreposição |
| **PEN-15** / **PEN-13** — sinal e multa | Spec 010 | Falta e cancelamento seguem a política do negócio |
| **PEN-14** — comissão via split | Spec 007 / 012 | A comissão do instrutor segue a mesma decisão |
| **PEN-24** — momento da nota | Spec 017 / 029 | Pacotes seguem a configuração da spec 017; planos, nota a cada cobrança |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Janela de check-in | ASSUMIDO: de 30 minutos antes a 15 minutos depois do início |
| Régua do aluno | ASSUMIDO: tentativas nos dias 1, 3 e 5; uso do plano suspenso no dia 7 |
| Fidelidade mínima | ASSUMIDO: sem fidelidade por padrão |
| Comissão do instrutor | ASSUMIDO: configurável entre fixo por aula e percentual por presença |
| Tenant suspenso | ASSUMIDO: cobranças dos alunos pausadas |

---

## Fora do escopo desta especificação

- Fila de espera de turma (proibida pela `[D30]`).
- Recurso compartilhado com bloqueio de sala (`[PEN-23]`).
- Aulas avulsas recorrentes de educação (spec 034).
- Aulas ao vivo online e conteúdo gravado.
- Avaliação física e ficha de treino.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: capacidade de 2 a 100; pacotes de 2 a 100 aulas e validade de 7 a 365 dias; aviso de vencimento 7 dias antes; aviso de mudança de preço 30 dias antes; inscrição em 3 toques; presença de 10 alunos em 1 minuto; grade de 10 turmas em 15 minutos.
- A cobrança recorrente do aluno usa o mesmo adaptador e as mesmas regras de idempotência da spec 012, com o estabelecimento como recebedor.
- As aulas são geradas com o mesmo mecanismo de materialização das séries (spec 013), com capacidade N.
- Os domínios donos são `scheduling` (turmas, aulas, inscrições, check-in) e `commerce` (planos e pacotes de aulas), conforme a CONST 4.4.
