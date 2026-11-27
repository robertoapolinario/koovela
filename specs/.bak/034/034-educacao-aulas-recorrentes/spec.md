# Feature Specification: Educação — aulas avulsas recorrentes

**Feature Branch**: `034-educacao-aulas-recorrentes`

**Created**: 2026-11-25

**Status**: Clarified

**Input**: User description: "034 educacao-aulas-recorrentes — seguir a sequência da constituição (seção 10), fase 3: [D41]. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: app do consumidor ("Aulas avulsas recorrentes") · web do consumidor (mesmo fluxo) · painel do cliente (séries de aulas na gestão de séries e na grade de turmas) · app do colaborador e `/pro` (aulas do instrutor, presença e registro da aula)

**Depende de**: 013 `series-recorrentes` (e, por ela, a v1.0); usa também 025 `atendidos-dependentes-pets` e 026 `turmas-planos-checkin` (fase 2)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, III, IV, seções 3 (criptografia de dados de menores e anotações de atendimento) e 10 (034, depende de 013, sem pendências) · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 4.2 (educação e aulas), 9.11, 17 (`[D18]`, `[D30]`, `[D41]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Escolas de idiomas, música, reforço escolar, esportes e professores particulares vendem **aulas que se repetem toda semana no mesmo horário**. Muitos não querem (ou não podem) trabalhar com matrícula, contrato semestral e reposição de aula: o aluno vem enquanto quiser e paga pelas aulas.

A decisão `[D41]` define:

- **aulas avulsas recorrentes**: o aluno reserva uma **série** de aulas (a mesma série recorrente da v1.0, `[D18]`, spec 013);
- **sem matrícula**: não há contrato, taxa de matrícula nem período mínimo;
- **sem reposição**: a falta do aluno não gera aula extra nem crédito; **segue a política de no-show** (spec 010).

Esta spec não cria um motor novo. Ela configura a série recorrente (spec 013) para a vertical de educação e liga a série às turmas (spec 026) quando a aula é em grupo. O plano mensal e os pacotes de aulas continuam na spec 026 (`[D30]`).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 4.2 | Atender educação e aulas | Negócios ativos da vertical |
| 3.1.11 | Manter a rotina de aulas | Aderência à série (aulas comparecidas / previstas) |
| 3.2.8 | Reduzir faltas | Faltas por aluno |

Personas: Proprietário de escola; instrutor (colaborador); aluno adulto; responsável por aluno menor.

---

## Clarifications

### Session 2026-11-25

- Q: "Aula avulsa recorrente" cobre só aula individual em série ou também vaga fixa em turma? → A: As duas formas: aula individual em série e vaga fixa recorrente em turma, ambas sem matrícula e sem reposição.
- Q: Quantas ocorrências da série ficam materializadas? (PEN-12, spec 013) → A: Sempre as próximas 4, renovadas automaticamente.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Oferecer aulas recorrentes sem matrícula (Priority: P1)

Como Proprietário de uma escola de música, quero marcar que as aulas de violão podem ser reservadas como série semanal, sem matrícula, e definir como o aluno paga.

**Why this priority**: sem a configuração, o fluxo do aluno não existe.

**Independent Test**: num negócio de educação de teste, ativar "aula recorrente" para "violão individual" e para a turma "violão em grupo — sábado 10h"; conferir que os dois aparecem no app como séries reserváveis.

**Acceptance Scenarios**:

1. **Given** um serviço do catálogo (spec 006) de um negócio de educação, **When** o Proprietário ativa "aula recorrente", **Then** define as frequências permitidas (semanal por padrão; a cada 2 semanas opcional), a data de fim opcional (por exemplo, fim do semestre) e as formas de pagamento aceitas.
2. **Given** o alcance desta spec, **When** a aula é individual ou em grupo, **Then** as duas formas existem: aula individual em série e vaga fixa recorrente em turma (REQ-EDU-002).
3. **Given** as formas de pagamento, **When** o Proprietário configura, **Then** escolhe entre cobrança por aula (cobrança automática de cada ocorrência no cartão salvo, como na spec 013) e consumo de um pacote de aulas (spec 026); plano mensal continua sendo produto separado da spec 026.
4. **Given** a configuração, **When** salva, **Then** não existe campo de matrícula, taxa de matrícula, período mínimo nem multa por saída; o aluno pode encerrar a série quando quiser.

---

### User Story 2 - Aluno reserva a série de aulas (Priority: P1)

Como aluno (ou responsável), quero escolher o dia e o horário fixo da aula, ver as próximas datas e confirmar de uma vez.

**Why this priority**: tela "Aulas avulsas recorrentes" (DF 9.11); é o fluxo da `[D41]`.

**Independent Test**: com um responsável de teste, reservar a série "violão individual, terças 18h" para um filho de 10 anos, com cobrança por aula; conferir as próximas ocorrências e a autorização de cobrança.

**Acceptance Scenarios**:

1. **Given** um serviço ou turma com aula recorrente, **When** o aluno escolhe o dia da semana, o horário e o instrutor, **Then** vê as próximas ocorrências (até o horizonte da série, spec 013), já com as que caem em feriado ou bloqueio marcadas como conflito.
2. **Given** a confirmação, **When** a cobrança é por aula, **Then** o aluno autoriza a cobrança automática de cada aula no cartão salvo (REQ-SER-003), com o aviso: "sem matrícula; falta não tem reposição".
3. **Given** a confirmação, **When** a forma é pacote, **Then** cada aula consome um crédito do pacote (REQ-SER-004); sem saldo, a série fica aguardando pagamento.
4. **Given** um aluno menor, **When** a série é criada, **Then** é criada pelo responsável para o dependente (spec 025); avisos e cobranças vão para o responsável.
5. **Given** uma vaga recorrente numa turma (se incluída pelo cenário 2 da História 1), **When** a turma tem vaga em todas as próximas ocorrências, **Then** a vaga é reservada em cada uma com a proteção de vaga da spec 026; ocorrências lotadas ficam em conflito com as alternativas da mesma modalidade.

---

### User Story 3 - Faltas sem reposição e cancelamentos (Priority: P1)

Como escola, quero que a falta siga a política de no-show sem gerar aula extra; como aluno, quero poder avisar antes que não vou e saber o que acontece.

**Why this priority**: "sem reposição" é a regra central da `[D41]` e precisa ser clara para o aluno.

**Independent Test**: numa série de teste, cancelar uma aula dentro da janela gratuita, cancelar outra fora dela e faltar numa terceira; conferir que nenhuma gera crédito de reposição e que as duas últimas seguem a política.

**Acceptance Scenarios**:

1. **Given** uma ocorrência, **When** o aluno cancela "só esta" dentro da janela gratuita da política (spec 010), **Then** a aula é cancelada sem custo e não é cobrada (ou o crédito do pacote não é consumido); não há aula de reposição.
2. **Given** um cancelamento fora da janela gratuita, **When** acontece, **Then** segue a política de cancelamento tardio (spec 010).
3. **Given** a falta sem aviso, **When** o instrutor marca ausência, **Then** segue a política de no-show (spec 010): a aula é cobrada ou o crédito é consumido, conforme a política; não há reposição.
4. **Given** faltas seguidas, **When** atingem o limite (REQ-SER-043, padrão 2), **Then** a série é pausada por faltas e o aluno ou responsável é avisado.
5. **Given** uma aula cancelada pela escola ou pelo instrutor, **When** isso acontece, **Then** não é falta do aluno: a aula não é cobrada (ou o crédito volta), e a escola pode oferecer outro horário naquela semana, como agendamento avulso; isso não é reposição de falta.
6. **Given** a vontade do aluno de parar, **When** ele encerra a série, **Then** as próximas aulas são canceladas sem multa de saída; as aulas dentro da janela de cancelamento tardio seguem a política.

---

### User Story 4 - Instrutor faz a chamada e registra a aula (Priority: P2)

Como instrutor, quero marcar presença e anotar o que foi trabalhado na aula, para que o aluno ou o responsável acompanhe.

**Why this priority**: útil para a rotina da escola, mas não bloqueia a reserva.

**Independent Test**: no app do colaborador, marcar presença de uma aula, escrever o conteúdo e conferir que o responsável vê o registro no app.

**Acceptance Scenarios**:

1. **Given** a agenda do instrutor, **When** ele abre a aula, **Then** marca presença ou ausência (check-in da spec 009 para aulas individuais; chamada da spec 026 para turmas).
2. **Given** a aula feita, **When** o instrutor registra o conteúdo (até 1.000 caracteres), **Then** o aluno adulto, ou o responsável pelo aluno menor, vê o registro em "Minhas séries".
3. **Given** o registro, **When** é sobre um aluno menor, **Then** fica cifrado como anotação de atendimento (CONST 3) e visível só ao responsável, ao instrutor e ao Proprietário.

---

### Edge Cases

- **Feriado ou recesso da escola**: as ocorrências ficam em conflito (spec 013); a escola pode marcar um recesso para todas as séries da filial, que ficam puladas sem custo.
- **Troca de instrutor por um período** (férias): as ocorrências entram na lista de afetados (REQ-SER-042) com a opção de passar a outro instrutor.
- **Mudança de preço por aula**: vale para as aulas materializadas depois do aviso (REQ-SER-013).
- **Aluno com duas séries no mesmo horário** (por exemplo, dois filhos com o mesmo responsável): permitido, porque são atendidos diferentes; a regra de conflito é por atendido.
- **Série com fim** (fim do semestre): encerra na última ocorrência com convite para criar outra (REQ-SER-041).
- **Aula online**: fora do escopo; a aula acontece na filial ou no endereço do aluno (spec 033), conforme o local do serviço.

---

## Requirements *(mandatory)*

Formato: `REQ-EDU-NNN (origem: …)`.

### Functional Requirements

**Configuração**

- **REQ-EDU-001** (origem: D41 | REQ-SER-052): O Proprietário DEVE poder ativar "aula recorrente" em serviços de negócios de educação, com frequências permitidas (semanal por padrão; a cada 2 semanas opcional), data de fim opcional e formas de pagamento.
- **REQ-EDU-002** (origem: D41): A spec DEVE cobrir as duas formas: aula individual em série e vaga fixa recorrente em turma (spec 026) paga por aula ou por pacote.
- **REQ-EDU-003** (origem: D41 | D30): As formas de pagamento DEVEM ser cobrança automática por aula (REQ-SER-003) ou consumo de pacote de aulas (spec 026); plano mensal continua separado (spec 026).
- **REQ-EDU-004** (origem: D41): NÃO DEVE existir matrícula, taxa de matrícula, período mínimo nem multa de saída; o aluno encerra a série quando quiser.

**Reserva**

- **REQ-EDU-010** (origem: D41 | REQ-SER-001): A série de aulas DEVE ser criada pelo aluno ou pelo responsável no app e na web, com dia, horário, instrutor e frequência, mostrando as próximas ocorrências e os conflitos.
- **REQ-EDU-011** (origem: D41): A confirmação DEVE mostrar o aviso "sem matrícula; falta não tem reposição" e exigir o aceite.
- **REQ-EDU-012** (origem: D28 | REQ-TUR-013): Série de aluno menor DEVE ser criada pelo responsável; avisos e cobranças vão para ele.
- **REQ-EDU-013** (origem: CONST I | REQ-TUR-010): Vaga recorrente em turma DEVE reservar a vaga em cada ocorrência com a proteção de vaga da spec 026; ocorrências lotadas ficam em conflito, com alternativas da mesma modalidade.
- **REQ-EDU-014** (origem: REQ-SER-005): O limite de séries e a regra de horário sobreposto DEVEM valer por atendido, não por conta.

**Faltas e cancelamentos**

- **REQ-EDU-020** (origem: D41): NÃO DEVE existir crédito nem aula de reposição por falta ou cancelamento do aluno.
- **REQ-EDU-021** (origem: D41 | REQ-POL-020): Cancelamento dentro da janela gratuita DEVE ser sem custo; fora dela, segue o cancelamento tardio; falta sem aviso segue o no-show (spec 010).
- **REQ-EDU-022** (origem: REQ-SER-043): Faltas seguidas acima do limite DEVEM pausar a série com aviso.
- **REQ-EDU-023** (origem: REQ-TUR-003): Aula cancelada pela escola ou pelo instrutor NÃO DEVE ser cobrada (ou o crédito volta); a escola pode oferecer um agendamento avulso na mesma semana.
- **REQ-EDU-024** (origem: J5): A escola DEVE poder declarar recesso na filial, deixando as ocorrências do período puladas, sem custo.

**Aula**

- **REQ-EDU-030** (origem: REQ-AGE-040 | REQ-TUR-020): O instrutor DEVE marcar presença ou ausência pelo app do colaborador e por `/pro`.
- **REQ-EDU-031** (origem: DF 3.1.11): O instrutor DEVE poder registrar o conteúdo da aula (até 1.000 caracteres), visível ao aluno adulto ou ao responsável.
- **REQ-EDU-032** (origem: CONST 3 | CONST IV): O registro DEVE ser cifrado como anotação de atendimento; se o aluno for menor, só o responsável, o instrutor e o Proprietário o veem.

### Key Entities

- **Configuração de aula recorrente** (no serviço ou na turma, versionada): frequências, data de fim, formas de pagamento.
- **Série de aulas**: a série da spec 013, com a marca "educação", ligada ao atendido (aluno) e, se em grupo, à turma.
- **Registro da aula**: ocorrência, instrutor, conteúdo (cifrado), data.
- **Recesso**: filial, período, motivo.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| App do consumidor | Aulas avulsas recorrentes | Registrado no plano |
| Web do consumidor | Aulas avulsas recorrentes (sem tela própria no protótipo) | Registrado no plano |
| Painel do cliente | Gestão de séries (spec 013) e turmas (spec 026), com a marca "aula" | Registrado no plano |
| App do colaborador e `/pro` | Presença e registro da aula | Registrado no plano |

A configuração de recesso e o registro da aula precisam ser conferidos no protótipo.

---

## Regras e estados

- **Série de aulas**: os estados da spec 013 (`ativa`, `pausada`, `pausada_por_faltas`, `aguardando_pagamento`, `encerrada`), sem estados novos.
- **Ocorrência**: os estados do agendamento (spec 009) ou da inscrição em turma (spec 026); nunca gera reposição.
- **Recesso**: ocorrências do período → `pulada`, sem custo.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Registro da aula | Pessoal; cifrado (anotação de atendimento) | Execução de contrato (art. 7, V); para menor, com o responsável (art. 14) | Prazo do agendamento (spec 022) | Aluno adulto ou responsável; instrutor; Proprietário |
| Dados do aluno menor | Pessoal de menor; cifrado (CONST 3) | Consentimento do responsável (art. 14) | Regras da spec 025 | Responsável; papéis do negócio na filial |

Esta spec não coleta outro dado novo: série, presença e pagamento usam as specs 013, 025, 026 e 012.

---

## Permissões

| Ação | Usuário (aluno ou responsável) | Colaborador (instrutor) | Recepção | Gerente | Proprietário |
|---|---|---|---|---|---|
| Configurar aula recorrente e recesso | — | — | — | ✔ filial | ✔ |
| Criar, pausar, encerrar a série | ✔ próprio ou dependente | — | ✔ filial | ✔ filial | ✔ |
| Marcar presença e registrar a aula | — | ✔ (as suas) | ✔ filial (só presença) | ✔ filial | ✔ |
| Ver o registro da aula | ✔ próprio ou dependente | ✔ (as suas) | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `scheduling.series.created.v1` (com `kind: lesson`) e os demais eventos da spec 013 | Ciclo da série de aulas |
| `scheduling.lesson.recorded.v1` | Registro da aula feito |
| `scheduling.branch.recess_declared.v1` | Recesso declarado |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Aderência: aulas comparecidas / previstas | DF 3.1.11 | Acompanhada |
| Faltas por aluno por mês | DF 3.2.8 | Acompanhada |
| Duração média das séries de aulas (semanas) | DF 4.2 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, falta ou cancelamento do aluno não gera crédito nem aula de reposição.
- **SC-002**: O aluno ou responsável reserva uma série de aulas em até 2 minutos.
- **SC-003**: 100% das aulas canceladas pela escola não são cobradas (ou devolvem o crédito).
- **SC-004**: 100% das confirmações de série mostram o aviso "sem matrícula; falta não tem reposição" antes do aceite.
- **SC-005**: Nenhum registro de aula de aluno menor é visível a quem não seja o responsável, o instrutor ou o Proprietário, verificado por teste.

---

## Pendências e conflitos

### Bloqueantes

| Item | Pergunta | Decisão (clarify 2026-11-25) |
|---|---|---|
| Alcance de "aula avulsa recorrente" | Só série individual ou também vaga fixa em turma? | As duas formas |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-12** — ocorrências materializadas à frente | Spec 013 | Sempre as próximas 4 (decidido) |
| **PEN-23** — recurso compartilhado (sala) | Adiado | A sala é só um nome, como na spec 026 |
| Política de no-show e cancelamento | Spec 010 | Aplicada a cada aula |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Frequência | ASSUMIDO: semanal por padrão; a cada 2 semanas opcional |
| Aula cancelada pela escola | ASSUMIDO: sem cobrança, com oferta opcional de agendamento avulso |
| Registro da aula | ASSUMIDO: texto até 1.000 caracteres, sem anexos |

---

## Fora do escopo desta especificação

- Matrícula, contrato semestral, taxa de matrícula e reposição de aulas (contrariam `[D41]`).
- Aulas online ou por videochamada.
- Boletim, notas, frequência escolar oficial e certificados.
- Plano mensal e pacotes de aulas (spec 026).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: série em até 2 minutos; registro de até 1.000 caracteres.
- A série de aulas usa o motor da spec 013 sem estados novos, e a turma usa a proteção de vaga da spec 026.
- O domínio dono é o mesmo da série recorrente (`scheduling`), com as turmas no domínio da spec 026.
