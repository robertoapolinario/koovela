# Feature Specification: Combo com troca de profissional

**Feature Branch**: `030-combo-troca-profissional`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "030 combo-troca-profissional — seguir a sequência da constituição (seção 10), fase 2: [D34]. Depende de 006 e 008. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 2 (em todas as plataformas, `[D35]`)

**Superfícies afetadas**: painel do cliente ("Configuração do combo com troca") · app do consumidor ("Combo com troca de profissional") · web do consumidor (mesmo fluxo) · app do colaborador e `/pro` (etapa do combo na agenda de cada profissional)

**Depende de**: 006 `catalogo` · 008 `motor-agenda-disponibilidade` (e, por elas, a v1.0)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípio I (combo atômico, lock por etapa), Princípio III, seções 2, 4.4 (`catalog`, `scheduling`), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 4.3, 6 (fase 2, `ComboEtapa`), 9.10, 17 (`[D19]`, `[D34]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Na v1.0, o combo é feito pelo mesmo profissional em todas as etapas (`[D19]`, spec 006). Mas muitos combos de beleza envolvem especialistas diferentes: corte com o cabeleireiro e manicure com a manicure; coloração com a colorista e escova com outro profissional.

A decisão `[D34]` cria a variante com **troca de profissional**:

- cada etapa tem um conjunto de **profissionais possíveis** (DF 6, `ComboEtapa`);
- o **sistema sugere a sequência e o cliente ajusta**;
- o **intervalo entre etapas é de até 15 minutos**, definido no combo;
- a reserva exige **lock simultâneo em todos os profissionais da sequência** e é **atômica**: todas as etapas ou nenhuma (CONST I).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 4.3 | Combo com troca de profissional | Agendamentos de combo com troca |
| 3.2.1 | Aumentar receita | Tíquete médio dos combos |
| 3.3.1 | Aumentar volume de atendimento | Ocupação dos profissionais envolvidos |

Personas: consumidor; Proprietário (configura o combo); Recepção (agenda pelo painel); colaboradores das etapas.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar um combo com troca de profissional (Priority: P1)

Como Proprietário, quero criar um combo em que cada etapa pode ser feita por um grupo diferente de profissionais, com o intervalo entre etapas.

**Why this priority**: tela "Configuração do combo com troca" (DF 9.10); sem ela, a variante não existe.

**Independent Test**: criar o combo "coloração + escova", com a etapa 1 feita pelas coloristas Ana ou Bia e a etapa 2 por qualquer profissional de escova, com intervalo de 10 minutos; conferir a pré-visualização da duração e do preço.

**Acceptance Scenarios**:

1. **Given** a criação de combo (spec 006), **When** o Proprietário escolhe "com troca de profissional", **Then** define para cada etapa (2 a 5) o serviço e os profissionais possíveis (todos que executam o serviço, ou uma lista).
2. **Given** o combo, **When** o Proprietário define o intervalo entre etapas, **Then** escolhe de 0 a 15 minutos (`[D34]`), igual para todas as transições ou por transição.
3. **Given** o combo com troca, **When** salvo, **Then** mostra a duração total estimada (soma das durações típicas e dos intervalos) e o preço do combo com a economia (spec 006).
4. **Given** uma etapa sem nenhum profissional possível ativo numa filial, **When** o combo é exibido, **Then** fica indisponível naquela filial (REQ-CAT-033).
5. **Given** o combo com troca, **When** um profissional da lista sai do negócio (spec 007), **Then** é removido da etapa e o Proprietário é avisado; se a etapa ficar sem ninguém, o combo é desativado.

---

### User Story 2 - Consumidor recebe a sequência sugerida e ajusta (Priority: P1)

Como consumidor, quero escolher o dia e receber os melhores horários para o combo inteiro, com os profissionais já sugeridos, e poder trocar o profissional de uma etapa se eu preferir outro.

**Why this priority**: tela "Combo com troca de profissional" (DF 9.10); é a regra "o sistema sugere a sequência e o cliente ajusta" da `[D34]`.

**Independent Test**: com 3 profissionais e agendas de teste, pedir os horários de um combo de 2 etapas num dia; conferir as sequências sugeridas; trocar a profissional da etapa 1 e conferir que os horários se recalculam.

**Acceptance Scenarios**:

1. **Given** o combo com troca e uma data, **When** o consumidor pede horários, **Then** vê horários de início em que existe uma sequência completa: cada etapa com um profissional possível livre, respeitando a ordem, as durações (inclusive as próprias de cada profissional, spec 007), o preparo, a limpeza e o intervalo máximo entre etapas.
2. **Given** um horário de início, **When** escolhido, **Then** o sistema mostra a sequência sugerida (profissional e horário de cada etapa), escolhida pela regra do negócio (padrão: menor espera total entre etapas; empate decidido pelo profissional menos ocupado no dia).
3. **Given** a sequência sugerida, **When** o consumidor troca o profissional de uma etapa, **Then** vê só os profissionais possíveis daquela etapa que mantêm a sequência viável, e os horários das etapas seguintes se ajustam; se a troca tornar a sequência inviável, a opção aparece desabilitada com o motivo.
4. **Given** a escolha de "quero o mesmo profissional em todas as etapas" (quando houver um que execute todas), **When** marcada, **Then** o combo se comporta como o combo da v1.0 (spec 006).
5. **Given** os horários, **When** calculados, **Then** respondem em até 1 segundo (p95), como na spec 008.

---

### User Story 3 - Reservar todas as etapas de uma vez (Priority: P1)

Como consumidor e como estabelecimento, quero que, ao confirmar, todas as etapas sejam reservadas juntas com os profissionais escolhidos, ou nenhuma, para não ficar com meio combo.

**Why this priority**: CONST I ("combo, com ou sem troca, reservado de forma atômica") e `[D34]` ("lock simultâneo em todos os profissionais").

**Independent Test**: reservar um combo de 3 etapas com 3 profissionais; em outro teste, ocupar a agenda do profissional da etapa 3 no instante da reserva e conferir que nenhuma etapa fica reservada e o consumidor recebe novas sugestões.

**Acceptance Scenarios**:

1. **Given** a sequência escolhida, **When** o consumidor confirma, **Then** a reserva temporária (spec 008) é feita para todas as etapas ao mesmo tempo, com lock em todos os profissionais e janelas envolvidos.
2. **Given** qualquer etapa que não pode ser ocupada no momento da reserva, **When** isso acontece, **Then** nenhuma etapa fica reservada, e o consumidor recebe a próxima sequência viável no mesmo horário ou nos mais próximos.
3. **Given** o combo reservado, **When** confirmado (spec 009), **Then** cada etapa aparece na agenda do seu profissional, ligada às demais, com a marca "combo".
4. **Given** pedidos simultâneos que disputam o mesmo profissional numa das etapas, **When** processados, **Then** só um combo é aceito com aquele profissional naquela janela.

---

### User Story 4 - Mudanças, atrasos e cancelamento de etapas (Priority: P2)

Como Recepção, quero remarcar, trocar o profissional de uma etapa ou lidar com o atraso de uma etapa sem perder a coerência do combo.

**Why this priority**: na operação, etapas atrasam e profissionais faltam; sem regra, o combo vira dois agendamentos soltos.

**Independent Test**: num combo de teste, trocar o profissional da etapa 2 por outro possível no mesmo horário; depois, registrar que a etapa 1 atrasou 20 minutos e conferir o aviso de impacto na etapa 2.

**Acceptance Scenarios**:

1. **Given** um combo confirmado, **When** a Recepção troca o profissional de uma etapa por outro possível e livre no mesmo horário, **Then** só aquela etapa muda, e o consumidor é avisado (spec 009).
2. **Given** a remarcação do combo, **When** pedida pelo consumidor ou pela Recepção, **Then** todas as etapas são reservadas de novo de forma atômica (spec 008), e as antigas são liberadas juntas.
3. **Given** o cancelamento, **When** acontece, **Then** todas as etapas são canceladas juntas e a política vale para o combo como um todo (spec 010); não existe cancelamento de uma etapa só pelo consumidor.
4. **Given** uma etapa que termina depois do previsto (check-out atrasado, spec 009), **When** isso empurra o início da próxima além do intervalo, **Then** o profissional da etapa seguinte e a Recepção recebem aviso, e a Recepção decide entre aguardar, trocar o profissional ou remarcar a etapa.
5. **Given** a ausência de um profissional de uma etapa (folga aprovada depois da reserva, spec 007), **When** registrada, **Then** o combo entra na lista de agendamentos afetados, com sugestão de outro profissional possível para a etapa.

---

### Edge Cases

- **Profissional possível em duas etapas**: pode fazer as duas, desde que os horários não se sobreponham; a sugestão prefere não trocar sem necessidade.
- **Intervalo zero**: a etapa seguinte começa assim que a anterior termina (com a limpeza da anterior e o preparo da seguinte).
- **Durações próprias por profissional** (spec 007): a sequência usa a duração de quem foi escolhido em cada etapa.
- **Combo com pet** (spec 025): a regra de duração por porte e pelagem vale em cada etapa que tiver regra.
- **Comissão**: cada profissional recebe a comissão da própria etapa, com o rateio do desconto do combo por etapa (REQ-CAT-034, spec 007).
- **Combo em série recorrente** (spec 013): cada ocorrência tenta manter os mesmos profissionais; se não for possível, entra em conflito com sugestões.
- **Profissionais em vários negócios** (spec 027): a detecção de conflito entre negócios vale para cada etapa.
- **Só um profissional livre em toda a sequência**: o combo é reservado normalmente com ele, se ele executar todas as etapas.

---

## Requirements *(mandatory)*

Formato: `REQ-CTR-NNN (origem: …)`.

### Functional Requirements

**Configuração**

- **REQ-CTR-001** (origem: D34 | DF 6 `ComboEtapa` | REQ-CAT-035): O combo com troca DEVE ter de 2 a 5 etapas, cada uma com serviço e profissionais possíveis (todos os que executam o serviço ou uma lista).
- **REQ-CTR-002** (origem: D34): O intervalo entre etapas DEVE ser de 0 a 15 minutos, único ou por transição.
- **REQ-CTR-003** (origem: REQ-CAT-033): O combo DEVE ficar indisponível numa filial se alguma etapa não tiver profissional possível ativo nela; profissional que sai é removido das etapas, com aviso, e etapa vazia desativa o combo.
- **REQ-CTR-004** (origem: CONST III): Preço, etapas, profissionais possíveis e intervalos DEVEM ser versionados; o agendamento congela a versão.

**Cálculo de horários e sugestão**

- **REQ-CTR-010** (origem: D34 | REQ-AGD-001): Os horários de início DEVEM considerar só inícios com sequência completa viável: cada etapa com um profissional possível livre, na ordem, com durações próprias, preparo, limpeza e intervalo máximo.
- **REQ-CTR-011** (origem: D34): Para cada horário, o sistema DEVE sugerir uma sequência pela regra do negócio (padrão: menor espera total; empate pelo profissional menos ocupado no dia).
- **REQ-CTR-012** (origem: D34): O consumidor DEVE poder trocar o profissional de qualquer etapa entre os que mantêm a sequência viável; as etapas seguintes se ajustam; opções inviáveis aparecem desabilitadas com o motivo.
- **REQ-CTR-013** (origem: D19): A opção "mesmo profissional em todas as etapas" DEVE estar disponível quando houver quem execute todas.
- **REQ-CTR-014** (origem: CONST 6): A consulta DEVE responder em até 1 segundo (p95).

**Reserva atômica**

- **REQ-CTR-020** (origem: CONST I | D34): A reserva DEVE adquirir lock em todos os profissionais e janelas da sequência ao mesmo tempo e ocupar todas as etapas de forma atômica; se uma falhar, nenhuma fica ocupada.
- **REQ-CTR-021** (origem: CONST I): Na falha, o consumidor DEVE receber a próxima sequência viável no mesmo horário ou nos mais próximos.
- **REQ-CTR-022** (origem: CONST VIII): O CI DEVE ter teste de concorrência e de falha injetada para combos com troca (N pedidos disputando um profissional de uma etapa: exatamente um aceito; falha na última etapa: nenhuma ocupada).

**Mudanças e operação**

- **REQ-CTR-030** (origem: REQ-AGE-034): A troca de profissional de uma etapa pela Recepção DEVE mudar só aquela etapa, com aviso ao consumidor.
- **REQ-CTR-031** (origem: CONST I | REQ-AGE-030): Remarcação DEVE reservar de novo todas as etapas de forma atômica e liberar as antigas juntas.
- **REQ-CTR-032** (origem: REQ-POL-020): O cancelamento DEVE valer para o combo inteiro; a política se aplica ao combo; o consumidor não cancela uma etapa isolada.
- **REQ-CTR-033** (origem: DF 9.4): Etapa atrasada que empurre a seguinte além do intervalo DEVE avisar o profissional seguinte e a Recepção, com as opções de aguardar, trocar profissional ou remarcar a etapa.
- **REQ-CTR-034** (origem: REQ-EQP-022): Ausência de profissional de uma etapa DEVE levar o combo à lista de afetados, com sugestão de outro profissional possível.
- **REQ-CTR-035** (origem: REQ-CAT-034 | REQ-EQP-044): Cada profissional DEVE receber a comissão da própria etapa, com o rateio do desconto do combo por etapa.

### Key Entities

- **Combo com troca** (variante do `combo` da spec 006, versionado): etapas, intervalos, preço, regra de sugestão.
- **Etapa do combo** (`ComboEtapa`): ordem, serviço, profissionais possíveis, intervalo até a próxima.
- **Sequência sugerida**: horário de início, etapa, profissional e janela de cada etapa.
- **Agendamento de combo** (spec 009): etapas ligadas, cada uma com profissional e ocupação.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.10) | Código |
|---|---|---|
| Painel do cliente | Configuração do combo com troca | Registrado no plano |
| App do consumidor | Combo com troca de profissional | Registrado no plano |
| Web do consumidor | Combo com troca (mesmo fluxo, dentro de Data e horário) | Registrado no plano |
| App do colaborador e `/pro` | Etapa do combo na agenda | Registrado no plano |

O aviso de etapa atrasada para a Recepção precisa ser conferido no protótipo.

---

## Regras e estados

- **Sequência viável**: todas as etapas com profissional possível livre, na ordem, com intervalo entre o fim de uma (com limpeza) e o início da seguinte (com preparo) de no máximo o configurado.
- **Sugestão padrão**: menor espera total; empate pelo menos ocupado no dia; preferir não trocar de profissional sem necessidade.
- **Reserva**: atômica; todas as etapas ou nenhuma.
- **Cancelamento**: sempre do combo inteiro; troca e remarcação de etapa só pela Recepção.

---

## Dados pessoais

Esta spec não coleta dado pessoal novo. Usa os dados do agendamento (spec 009) e do colaborador (spec 007). O consumidor vê o nome de exibição de cada profissional sugerido; nenhum dado de agenda de outros consumidores é exposto (os horários mostram só disponibilidade).

---

## Permissões

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário |
|---|---|---|---|---|---|
| Configurar combo com troca | — | — | — | ✔ filial | ✔ |
| Agendar, ajustar a sequência e confirmar | ✔ | — | ✔ filial | ✔ filial | ✔ |
| Trocar profissional de uma etapa; remarcar etapa atrasada | — | — | ✔ filial | ✔ filial | ✔ |
| Cancelar o combo | ✔ próprio | ✔ (como estabelecimento) | ✔ filial | ✔ filial | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `catalog.combo.swap_variant_published.v1` | Nova versão de combo com troca |
| `scheduling.combo.sequence_suggested.v1` | Sequência sugerida (agregável, sem PII) |
| `scheduling.combo.sequence_adjusted.v1` | Consumidor trocou profissional de uma etapa |
| `scheduling.combo.step_professional_changed.v1` | Recepção trocou o profissional de uma etapa |
| `scheduling.combo.step_delayed.v1` | Etapa atrasada com impacto na seguinte |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Agendamentos de combo com troca e tíquete médio | DF 3.2.1 | Acompanhada |
| % de sequências ajustadas pelo consumidor | `[D34]` | Acompanhada |
| Espera média entre etapas | `[D34]` | Abaixo do intervalo configurado |
| Etapas atrasadas além do intervalo | Operação | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de concorrência e de falha injetada, nenhum combo fica com parte das etapas reservadas.
- **SC-002**: 95% das consultas de horários de combo com troca respondem em até 1 segundo.
- **SC-003**: O consumidor agenda um combo com troca, aceitando a sugestão, em até 3 toques depois de escolher o dia.
- **SC-004**: Nenhuma sequência sugerida tem intervalo entre etapas maior que o configurado.
- **SC-005**: O Proprietário configura um combo com troca de 3 etapas em até 3 minutos.
- **SC-006**: 100% das etapas atrasadas além do intervalo geram aviso ao profissional seguinte e à Recepção.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-04** — colaborador em várias filiais | Spec 007 | Profissionais possíveis são os da filial do agendamento |
| **C6** — conflito entre negócios | Spec 027 | Detecção vale para cada etapa |
| **PEN-14** — comissão via split | Spec 007 / 012 | Cada etapa segue a mesma decisão |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Sugestão | ASSUMIDO: menor espera total; empate pelo menos ocupado |
| Cancelamento | ASSUMIDO: só do combo inteiro pelo consumidor |
| Etapas | ASSUMIDO: de 2 a 5, como no combo da v1.0 |

---

## Fora do escopo desta especificação

- Etapas em paralelo (dois profissionais ao mesmo tempo no mesmo consumidor).
- Etapas em filiais diferentes.
- Recurso compartilhado por etapa (cadeira, lavatório), adiado (`[PEN-23]`).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: consulta em até 1 segundo; agendamento em 3 toques; configuração em até 3 minutos.
- A sequência sugerida usa os mesmos horários livres, grade e antecedência da spec 008.
- Os domínios donos são `catalog` (configuração do combo) e `scheduling` (sugestão, reserva e operação), conforme a CONST 4.4 ("combos com troca `[D34]`" em `scheduling`).
