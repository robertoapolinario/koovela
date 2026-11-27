# Feature Specification: Séries recorrentes

**Feature Branch**: `013-series-recorrentes`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "013 series-recorrentes — seguir a sequência da constituição (seção 10): J5. Depende de 009. Pendência PEN-12. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (base para as aulas recorrentes da fase 3, `[D41]`)

**Superfícies afetadas**: app do consumidor e web do consumidor ("Minhas séries recorrentes" / "Minhas séries"; criação de série no fluxo de agendamento) · painel do cliente ("Gestão de séries recorrentes"; agendas) · app do colaborador e `/pro` (ocorrências na agenda)

**Depende de**: 009 `agendamento-ciclo-de-vida` (e, por ela, 002 a 008); usa a política da 010, os avisos da 011 e os pagamentos e saldos da 012

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, III, IX, XI, seções 2, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.1.11, 4.3, 6, 6.1 (invariante 6), 8 (J5), 9.1, 9.3, 9.8, 17 (`[D18]`, `[D41]`) e 18 (`[PEN-12]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Boa parte do atendimento em beleza e saúde é recorrente: o corte a cada 3 semanas, a manicure toda sexta, a fisioterapia duas vezes por semana, a terapia semanal. Remarcar tudo à mão, uma vez por vez, é exatamente o que faz o consumidor abandonar o tratamento (DF 3.1.11, "aderência à série") e o estabelecimento perder o horário fixo.

A série recorrente completa está na v1.0 `[D18]`. A J5 (DF 8) define o fluxo: **definição da série → materialização de N ocorrências → tratamento de feriado e bloqueio → alteração de uma ocorrência ou da série → encerramento**. Quantas ocorrências são materializadas à frente ainda não está decidido (`[PEN-12]`).

Duas regras da constituição moldam esta spec:

- **cada ocorrência é um agendamento** e passa pela mesma proteção contra reserva dupla (CONST I, spec 008);
- **alterar uma ocorrência não altera as demais** sem comando explícito (CONST I; DF 6.1, invariante 6).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.11 | Manter tratamento com sessões recorrentes | Aderência à série |
| 3.1.8 | Voltar ao mesmo profissional | % com profissional escolhido |
| 3.2.4 | Reter clientes | Recompra 30/60/90 dias |
| 3.3.1 | Aumentar volume de atendimento | Ocupação pessoal |

Personas: consumidor; Recepção, Gerente e Proprietário; Colaborador.

---

## Clarifications

### Session 2026-11-25

- Q: Quantas ocorrências da série são materializadas à frente? (PEN-12) → A: Sempre as próximas 4 ocorrências, renovadas automaticamente à medida que cada uma passa.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar uma série (Priority: P1)

Como consumidor ou como Recepção, quero transformar um agendamento num horário fixo que se repete (por exemplo, toda terça às 19h com a mesma profissional), escolhendo a frequência e até quando, para não precisar agendar de novo.

**Why this priority**: é a definição da série, primeiro passo da J5.

**Independent Test**: criar uma série semanal de 10 ocorrências pelo app e outra quinzenal sem data de fim pelo painel; conferir as ocorrências criadas na agenda e em "Minhas séries".

**Acceptance Scenarios**:

1. **Given** um agendamento sendo feito ou já confirmado, **When** o consumidor ou a equipe escolhe "repetir", **Then** define a frequência (semanal, a cada 2, 3 ou 4 semanas, ou mensal no mesmo dia da semana, por exemplo "toda primeira terça") e o fim (depois de N ocorrências, de 2 a 52; numa data; ou sem fim).
2. **Given** a definição, **When** confirmada, **Then** a série é criada com o mesmo serviço (ou combo), profissional, filial, dia da semana e horário do agendamento de origem, e as próximas 4 ocorrências são materializadas, renovadas automaticamente à medida que cada uma passa (`[PEN-12]` resolvido).
3. **Given** cada ocorrência, **When** materializada, **Then** vira um agendamento normal (spec 009), com a proteção contra reserva dupla (spec 008), ligado à série e numerado ("3 de 10").
4. **Given** uma série sem fim ou longa, **When** o tempo passa, **Then** novas ocorrências são materializadas automaticamente para manter a quantidade definida à frente.
5. **Given** o negócio, **When** o Proprietário desliga "o consumidor pode criar séries" (padrão: ligado), **Then** só a equipe cria séries.
6. **Given** a política do negócio exige sinal (spec 010), **When** o consumidor cria uma série, **Then** precisa autorizar a cobrança automática do sinal de cada ocorrência no cartão salvo (spec 012) ou usar um pacote de sessões; sem isso, a série não é criada pelo app.
7. **Given** um consumidor com pacote de sessões do serviço (spec 006), **When** cria a série, **Then** pode escolher que cada ocorrência use uma sessão do pacote, até o saldo acabar.

---

### User Story 2 - Ocorrências que caem em feriado, folga ou horário ocupado (Priority: P1)

Como consumidor e como estabelecimento, quero que, quando uma ocorrência não puder acontecer no horário da série (feriado, folga do profissional, horário já ocupado), ela não seja marcada por cima de nada e eu receba alternativas para escolher.

**Why this priority**: é o "tratamento de feriado e bloqueio" da J5; sem isso, a série vira reserva dupla ou buraco silencioso.

**Independent Test**: criar uma série semanal que passa por um feriado cadastrado na filial e por uma folga aprovada do profissional; conferir que essas duas ocorrências ficam em conflito, com alternativas, e que as demais são criadas normalmente.

**Acceptance Scenarios**:

1. **Given** uma ocorrência cuja data cai em feriado ou exceção da filial (spec 005), folga ou bloqueio do profissional (spec 007), ou horário já ocupado, **When** a materialização tenta criá-la, **Then** ela não ocupa a agenda e fica `em_conflito`, com o motivo.
2. **Given** uma ocorrência em conflito, **When** isso é detectado, **Then** o consumidor e a Recepção recebem aviso (spec 011) com até 3 alternativas: mesmo profissional no mesmo dia em outro horário, mesmo profissional em dia próximo, ou outro profissional no horário da série.
3. **Given** as alternativas, **When** o consumidor ou a Recepção escolhe uma, **Then** a ocorrência vira agendamento no horário escolhido, só ela muda, e as demais continuam no horário da série.
4. **Given** uma ocorrência em conflito sem escolha, **When** faltam 24 horas para o horário original, **Then** ela é marcada como `pulada`, sem custo, e o consumidor é avisado.
5. **Given** uma folga aprovada ou um bloqueio criado depois que a ocorrência já foi materializada, **When** isso acontece, **Then** a ocorrência aparece na lista de agendamentos afetados (REQ-AGE-033) com a marca "série" e as mesmas alternativas.

---

### User Story 3 - Mudar uma ocorrência, as próximas ou a série inteira (Priority: P1)

Como consumidor ou estabelecimento, quero remarcar ou cancelar só uma ocorrência sem mexer nas outras, ou mudar o horário a partir de agora, ou encerrar a série, sempre escolhendo explicitamente o alcance da mudança.

**Why this priority**: invariante 6 do DF 6.1 e Princípio I; é a "alteração de uma ocorrência ou da série" da J5.

**Independent Test**: numa série de 8 ocorrências, remarcar a 3ª (só ela muda), mudar o horário "desta e das próximas" a partir da 5ª (5ª a 8ª mudam), e conferir que 1ª, 2ª e 4ª continuam iguais.

**Acceptance Scenarios**:

1. **Given** uma ocorrência, **When** o consumidor ou a equipe remarca ou cancela, **Then** a tela pergunta o alcance: "só esta", "esta e as próximas" ou "a série inteira (as futuras)"; o padrão é "só esta".
2. **Given** "só esta", **When** confirmado, **Then** apenas aquela ocorrência muda, seguindo as regras da spec 009 e da política (spec 010); nenhuma outra é alterada.
3. **Given** "esta e as próximas" com novo dia, horário ou profissional, **When** confirmado, **Then** as ocorrências futuras a partir dela são reservadas de novo no novo horário, cada uma com a proteção da spec 008; as que não couberem ficam `em_conflito` com alternativas; as anteriores não mudam.
4. **Given** o cancelamento de "esta e as próximas" ou da série, **When** confirmado, **Then** a série é encerrada a partir dali; cada ocorrência cancelada segue a política congelada dela: as que estão fora da janela gratuita são canceladas sem custo, e as de dentro da janela seguem a regra da spec 010, mostrada antes de confirmar.
5. **Given** uma ocorrência já remarcada individualmente, **When** depois há uma mudança "esta e as próximas" que a alcança, **Then** a tela avisa que ela tinha horário próprio e pergunta se deve seguir a nova regra ou manter o horário próprio.
6. **Given** qualquer mudança de alcance maior que "só esta", **When** feita, **Then** fica registrada na série com ator, alcance, regra anterior e nova.

---

### User Story 4 - Pausar e encerrar (Priority: P2)

Como consumidor, quero pausar minha série durante as férias sem perdê-la; como estabelecimento, quero que a série se encerre sozinha quando chegar ao fim, quando o profissional sair ou quando o consumidor faltar seguidamente.

**Why this priority**: é o "encerramento" da J5 e evita horários fixos ocupados por quem não vem.

**Independent Test**: pausar uma série por 3 semanas e conferir que as ocorrências do período ficam `puladas` sem custo e as seguintes continuam; marcar 2 faltas seguidas e conferir a pausa automática.

**Acceptance Scenarios**:

1. **Given** uma série ativa, **When** o consumidor ou a equipe pausa por um período (até 90 dias), **Then** as ocorrências do período ficam `puladas` sem custo (as que estiverem dentro da janela gratuita seguem a política) e a série volta sozinha ao fim da pausa.
2. **Given** a última ocorrência de uma série com fim, **When** concluída, **Then** a série fica `encerrada` e o consumidor recebe o convite para criar uma nova (spec 011).
3. **Given** o vínculo do profissional com data de fim (spec 007), **When** a série tem ocorrências depois dessa data, **Then** elas aparecem na resolução de agendamentos afetados, e a equipe pode passar a série a outro profissional (a partir de uma data) ou encerrá-la.
4. **Given** 2 não comparecimentos seguidos numa série (padrão, ajustável de 1 a 5 pelo Proprietário), **When** o segundo é marcado, **Then** a série fica `pausada_por_faltas`, as ocorrências futuras são liberadas, e o consumidor e a Recepção são avisados; a equipe pode retomar a série.
5. **Given** o saldo do pacote usado pela série acabou, **When** a próxima ocorrência seria materializada, **Then** o consumidor é avisado para comprar outro pacote ou passar a pagar por ocorrência, e a série fica `aguardando_pagamento` até a escolha.

---

### User Story 5 - Ver e gerir as séries (Priority: P2)

Como consumidor, quero ver minhas séries com as próximas ocorrências; como estabelecimento, quero uma visão das séries ativas da filial, com conflitos e pendências.

**Why this priority**: telas "Minhas séries recorrentes" (DF 9.1, 9.8) e "Gestão de séries recorrentes" (DF 9.3).

**Independent Test**: com 3 séries de teste (uma ativa, uma com conflito, uma pausada), abrir as telas do consumidor e do painel e conferir estados, próximas ocorrências e ações.

**Acceptance Scenarios**:

1. **Given** "Minhas séries", **When** o consumidor abre, **Then** vê cada série com estabelecimento, serviço, profissional, regra ("toda terça, 19h"), próximas ocorrências, ocorrências em conflito e ações (pausar, mudar, encerrar).
2. **Given** "Gestão de séries recorrentes", **When** a Recepção abre, **Then** vê as séries da filial por estado, com filtros por profissional e por "em conflito", e a quantidade de horários fixos ocupados por profissional.
3. **Given** uma ocorrência em conflito, **When** a Recepção a abre pela gestão de séries, **Then** vê as alternativas e resolve em um toque.
4. **Given** a agenda do dia (spec 009), **When** exibida, **Then** ocorrências de série aparecem com a marca "série" e a numeração.

---

### Edge Cases

- **Série mensal "todo dia 31"**: não existe; a frequência mensal é sempre por posição do dia da semana ("toda primeira terça", "toda última sexta").
- **Mudança de horário de verão**: o horário da série é a hora local da filial; cada ocorrência é calculada na data.
- **Preço do serviço muda** (spec 006): cada ocorrência congela as versões vigentes quando é materializada; o consumidor é avisado do novo preço antes de as próximas ocorrências serem materializadas e pode encerrar a série sem custo.
- **Política muda** (spec 010): idem; cada ocorrência congela a política vigente na materialização.
- **Combo na série**: cada ocorrência reserva todas as etapas de forma atômica (spec 008).
- **Limite de agendamentos futuros** (REQ-AGE-017): as ocorrências de série não entram no limite de 5; o limite de séries ativas é de 3 por consumidor e negócio.
- **Duas séries do mesmo consumidor no mesmo horário**: recusado na criação.
- **Tenant suspenso** (spec 002): a materialização para; as ocorrências já criadas seguem a regra de agendamentos de tenant suspenso.
- **Consumidor exclui a conta** (spec 003): as séries são encerradas e as ocorrências futuras canceladas conforme a política.
- **Ocorrência materializada e depois desmarcada pelo estabelecimento**: segue o cancelamento pelo estabelecimento (sem multa); a série continua.

---

## Requirements *(mandatory)*

Formato: `REQ-SER-NNN (origem: …)`.

### Functional Requirements

**Definição**

- **REQ-SER-001** (origem: D18 | J5): A série DEVE ter: consumidor, serviço ou combo, profissional, filial, horário local, frequência (semanal; a cada 2, 3 ou 4 semanas; mensal por posição do dia da semana), início, fim (N ocorrências de 2 a 52, data, ou sem fim), forma de pagamento das ocorrências e estado.
- **REQ-SER-002** (origem: J5 | DF 9.3): A série DEVE poder ser criada pelo consumidor (app e web), quando o negócio permitir (padrão: permite), e pela equipe.
- **REQ-SER-003** (origem: REQ-POL-003 | REQ-PAG-024): Se a política exige sinal, a criação pelo consumidor DEVE exigir autorização de cobrança automática do sinal de cada ocorrência no cartão salvo, ou o uso de pacote de sessões.
- **REQ-SER-004** (origem: REQ-CAT-045 | REQ-PAG-062): A série DEVE poder consumir sessões de um pacote, uma por ocorrência, até o saldo acabar.
- **REQ-SER-005** (origem: edge case): O consumidor NÃO DEVE ter mais de 3 séries ativas por negócio, nem duas séries no mesmo horário; as ocorrências de série não contam no limite de agendamentos futuros (REQ-AGE-017).

**Materialização**

- **REQ-SER-010** (origem: PEN-12 | J5): A série DEVE manter sempre as próximas 4 ocorrências materializadas, renovando a cada ocorrência que passa, mesmo além do horizonte de agendamento do negócio.
- **REQ-SER-011** (origem: CONST I | REQ-AGD-026): Cada ocorrência DEVE ser materializada como agendamento da spec 009, com a proteção contra reserva dupla da spec 008, ligado à série e numerado.
- **REQ-SER-012** (origem: J5): A materialização DEVE rodar automaticamente pelo menos uma vez por dia, mantendo a quantidade à frente; DEVE ser idempotente (nunca criar duas ocorrências para a mesma data da série).
- **REQ-SER-013** (origem: CONST III): Cada ocorrência DEVE congelar as versões vigentes no momento da sua materialização; mudanças de preço ou política DEVEM ser avisadas ao consumidor antes da materialização das próximas ocorrências, com a opção de encerrar a série sem custo.

**Conflitos**

- **REQ-SER-020** (origem: J5 "feriado e bloqueio" | CONST I): Ocorrência que cai em exceção da filial, folga, bloqueio ou horário ocupado NÃO DEVE ocupar a agenda; DEVE ficar `em_conflito`, com motivo.
- **REQ-SER-021** (origem: J5): Para cada ocorrência em conflito, DEVEM ser oferecidas até 3 alternativas (mesmo profissional no mesmo dia em outro horário; mesmo profissional em dia próximo; outro profissional no horário da série), com aviso ao consumidor e à Recepção.
- **REQ-SER-022** (origem: J5): Ocorrência em conflito sem escolha até 24 horas antes do horário original DEVE ficar `pulada`, sem custo, com aviso.
- **REQ-SER-023** (origem: REQ-AGE-033): Ocorrências materializadas afetadas por folga, bloqueio ou mudança de horário posteriores DEVEM entrar na lista de agendamentos afetados com a marca "série" e as mesmas alternativas.

**Alteração**

- **REQ-SER-030** (origem: CONST I | DF 6.1 inv. 6): Toda remarcação ou cancelamento de ocorrência DEVE exigir a escolha explícita do alcance ("só esta", "esta e as próximas", "a série inteira"), com padrão "só esta"; "só esta" NÃO DEVE alterar nenhuma outra ocorrência.
- **REQ-SER-031** (origem: CONST I): "Esta e as próximas" com novo horário DEVE reservar de novo cada ocorrência futura com a proteção da spec 008; as que não couberem ficam `em_conflito`.
- **REQ-SER-032** (origem: REQ-POL-020): Cancelamento em alcance maior DEVE aplicar a política congelada de cada ocorrência, mostrando antes o total de multas, se houver.
- **REQ-SER-033** (origem: DF 6.1 inv. 6): Ocorrência com horário próprio DEVE ser preservada numa mudança maior, salvo escolha explícita.
- **REQ-SER-034** (origem: CONST I | CONST IX): Toda mudança da série DEVE ser registrada (ator, alcance, regra anterior, regra nova, horário) e publicada como evento.
- **REQ-SER-035** (origem: CONST VIII): DEVE existir teste de propriedade que verifique que nenhuma sequência de mudanças "só esta" altera outra ocorrência (invariante 6), como portão de merge.

**Pausa e encerramento**

- **REQ-SER-040** (origem: J5 "encerramento"): A série DEVE poder ser pausada por até 90 dias (ocorrências do período `puladas`, sem custo fora da janela gratuita) e retomada automaticamente.
- **REQ-SER-041** (origem: J5): A série com fim DEVE ser encerrada após a última ocorrência, com convite para criar outra.
- **REQ-SER-042** (origem: REQ-EQP-062): Vínculo do profissional com data de fim DEVE levar as ocorrências posteriores à resolução de afetados, com a opção de passar a série a outro profissional a partir de uma data.
- **REQ-SER-043** (origem: DF 3.2.8): Depois de N não comparecimentos seguidos (padrão 2, de 1 a 5, configurável pelo Proprietário), a série DEVE ir para `pausada_por_faltas`, liberando as ocorrências futuras, com aviso.
- **REQ-SER-044** (origem: REQ-PAG-061): Fim do saldo do pacote DEVE levar a série a `aguardando_pagamento` até o consumidor escolher novo pacote ou pagamento por ocorrência.

**Telas e contratos**

- **REQ-SER-050** (origem: DF 9.1 | DF 9.8): "Minhas séries" DEVE mostrar regra, próximas ocorrências, conflitos e ações de cada série do consumidor.
- **REQ-SER-051** (origem: DF 9.3): "Gestão de séries recorrentes" DEVE mostrar as séries da filial por estado, com filtros por profissional e conflito, horários fixos por profissional, e resolução de conflitos em um toque.
- **REQ-SER-052** (origem: CONST VII | D41): A série DEVE ser oferecida por contrato, para ser reaproveitada pelas aulas recorrentes da fase 3 (spec 034).
- **REQ-SER-053** (origem: CONST II): Séries ficam no espaço de dados do tenant; a projeção "Meus agendamentos" (REQ-AGE-020) recebe as ocorrências por eventos.

### Key Entities

- **Série** (`recurring_series`): consumidor, serviço ou combo, profissional, filial, horário local, frequência, início, fim, forma de pagamento (por ocorrência, sinal automático no cartão, pacote), estado, criada por.
- **Ocorrência**: série, número, data prevista, agendamento (quando materializada), estado, horário próprio (sim ou não), motivo do conflito, alternativas oferecidas.
- **Mudança de série**: série, alcance, regra anterior, regra nova, ator, horário.
- **Pausa**: série, início, fim, motivo.
- **Configuração de séries do negócio**: consumidor pode criar (sim ou não), faltas seguidas para pausar.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Minhas séries recorrentes · opção "repetir" no Resumo e na Confirmação | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Minhas séries | `W..` registrado no plano |
| Painel (DF 9.3) | Gestão de séries recorrentes · marca "série" na agenda | Registrados no plano |
| App do colaborador e `/pro` | Marca "série" e numeração na agenda | Registrados no plano |

A escolha de alcance ("só esta", "esta e as próximas", "a série inteira") e a tela de alternativas de conflito precisam ser conferidas no protótipo; se não existirem, são telas novas.

---

## Regras e estados

**Série**: `ativa` ↔ `pausada` (até 90 dias) · `ativa` → `pausada_por_faltas` → `ativa` (equipe retoma) · `ativa` → `aguardando_pagamento` → `ativa` · qualquer → `encerrada`.

**Ocorrência**: `prevista` → `materializada` (vira agendamento) | `em_conflito` → `materializada` (alternativa escolhida) | `pulada`; `materializada` segue a máquina de estados do agendamento (spec 009).

**Alcance das mudanças**: "só esta" (padrão) · "esta e as próximas" · "a série inteira (as futuras)". Ocorrências passadas nunca mudam.

**Frequência mensal**: sempre por posição do dia da semana na semana do mês (primeira, segunda, terceira, quarta, última).

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Série (consumidor, regra de horário, profissional) | Pessoal (hábito) | Execução de contrato (art. 7, V) | Igual aos agendamentos da série (spec 009) | O próprio consumidor; equipe da filial |
| Autorização de cobrança automática do sinal | Pessoal (financeiro) | Consentimento (art. 7, I) | Até o fim da série ou a revogação | O próprio consumidor; Proprietário; Financeiro/Ops |
| Histórico de mudanças da série | Pessoal (atores) | Execução de contrato | Igual à série | Equipe da filial |

Regras: a série não guarda dado de saúde; em saúde, a regularidade do tratamento é visível só à equipe da filial e ao próprio consumidor.

---

## Permissões

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte |
|---|---|---|---|---|---|---|
| Criar série | ✔ (se o negócio permitir) | — | ✔ filial | ✔ filial | ✔ | ✔* |
| Mudar, pausar, encerrar série | ✔ própria | ✔ própria (como estabelecimento) | ✔ filial | ✔ filial | ✔ | ✔* |
| Resolver conflitos | ✔ própria | — | ✔ filial | ✔ filial | ✔ | ✔* |
| Passar série a outro profissional | — | — | ✔ filial | ✔ filial | ✔ | — |
| Configurar séries do negócio | — | — | — | — | ✔ | — |

`✔*` = apenas em sessão de suporte (spec 003).

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `scheduling.series.created.v1` / `.changed.v1` / `.paused.v1` / `.resumed.v1` / `.ended.v1` | Ciclo da série |
| `scheduling.series.occurrence_materialized.v1` | Ocorrência virou agendamento |
| `scheduling.series.occurrence_conflicted.v1` / `.occurrence_resolved.v1` / `.occurrence_skipped.v1` | Conflitos |
| `scheduling.series.paused_for_no_shows.v1` | Pausa por faltas |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Aderência à série (ocorrências concluídas / materializadas) | DF 3.1.11 | Acompanhada |
| Duração média das séries (semanas até o encerramento) | DF 3.2.4 | Acompanhada |
| % de ocorrências em conflito e % resolvidas antes de pular | J5 | Acompanhada; resolvidas acima de 70% |
| % de agendamentos do negócio vindos de séries | DF 3.3.1 | Acompanhada |
| Séries pausadas por faltas | DF 3.2.8 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O consumidor cria uma série a partir de um agendamento em até 3 toques.
- **SC-002**: Nenhuma ocorrência de série ocupa horário de feriado, folga, bloqueio ou de outro atendimento, em 100% dos testes.
- **SC-003**: Nenhuma mudança "só esta" altera outra ocorrência, em 100% dos testes de propriedade.
- **SC-004**: 100% das ocorrências em conflito geram aviso com alternativas ao consumidor e à Recepção.
- **SC-005**: A materialização mantém a quantidade de ocorrências à frente sem nenhuma duplicada, em 100% das execuções repetidas.
- **SC-006**: Toda mudança de preço ou política é avisada ao consumidor antes de afetar uma nova ocorrência.
- **SC-007**: A Recepção resolve uma ocorrência em conflito em até 30 segundos pela gestão de séries.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-12** — quantas ocorrências materializar à frente | Volume de dados, ocupação da agenda, experiência do consumidor | **Resolvido (clarify 2026-11-25)**: sempre as próximas 4 |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **PEN-15** / **PEN-13** | Série com sinal exige cobrança automática autorizada no cartão salvo ou pacote; multas seguem a spec 010 |
| Frequências | ASSUMIDO: semanal; a cada 2, 3 ou 4 semanas; mensal por posição do dia da semana |
| Congelamento | ASSUMIDO: cada ocorrência congela as versões na materialização, com aviso prévio de mudanças |
| Faltas seguidas | ASSUMIDO: 2 faltas seguidas pausam a série (ajustável de 1 a 5) |
| Conflito sem escolha | ASSUMIDO: pulado sem custo 24 horas antes do horário original |

---

## Fora do escopo desta especificação

- Cálculo de horários e proteção contra reserva dupla (spec 008).
- Ciclo de vida de cada ocorrência como agendamento (spec 009).
- Regras de multa e de sinal (spec 010) e execução financeira (spec 012).
- Turmas com N vagas e planos de aula mensais (spec 026).
- Aulas avulsas recorrentes de educação (spec 034), que reaproveitam esta série.
- Séries com profissionais diferentes por ocorrência (rodízio).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: de 2 a 52 ocorrências ou sem fim; pausa de até 90 dias; 3 séries ativas por consumidor e negócio; conflito resolvido até 24 horas antes; materialização pelo menos diária; criação em até 3 toques; resolução de conflito em até 30 segundos.
- As alternativas de conflito usam a consulta de horários da spec 008, com as mesmas regras de grade, antecedência e horizonte.
- A série segue a escolha de profissional do agendamento de origem; com "qualquer profissional", o profissional atribuído na primeira ocorrência passa a ser o da série.
- O domínio dono desta spec é `scheduling` (CONST 4.4).
