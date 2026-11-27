# Feature Specification: Atendidos — dependentes e pets

**Feature Branch**: `025-atendidos-dependentes-pets`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "025 atendidos-dependentes-pets — seguir a sequência da constituição (seção 10), fase 2: [D28] [D29]. Depende de 009 e 022. Pendência C2. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 2 (em todas as plataformas, `[D35]`)

**Superfícies afetadas**: app do consumidor ("Para quem eu agendo", "Cadastro do pet", passo "Agendar para quem") · web do consumidor (mesmo passo e gestão de atendidos) · painel do cliente ("Ficha do pet"; atendido na ficha e na agenda; serviços por tipo de atendido) · app do colaborador e `/pro` (atendido no detalhe do atendimento)

**Depende de**: 009 `agendamento-ciclo-de-vida` · 022 `privacidade-direitos-titular` (e, por elas, a v1.0)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, III, IV, seções 2 (`service_subject`), 4.4 (`household`), 8 (`[C2]`) e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.1, 3.1.9, 4.1, 4.2, 4.3, 6 (fase 2), 9.10, 12, 17 (`[D21]`, `[D28]`, `[D29]`) e 18 (`[C2]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Na v1.0, quem agenda é sempre quem é atendido. Mas muita gente agenda para outra pessoa ou para o próprio animal: a mãe que marca o dentista do filho, o filho que marca a fisioterapia do pai idoso, o tutor que marca o banho e tosa do cachorro (DF 3.1.9, "agendar para dependentes").

A fase 2 traz o **atendido** (`service_subject`) com as regras da `[D28]`: filho ou menor, idoso ou adulto dependente, e pet; o **titular paga e acumula os pontos** de todos. O fluxo de agendamento ganha o passo "para quem". E a `[D29]` define a vertical pet: **banho, tosa e adestramento, sem veterinário**, com a **duração do serviço variando por porte e pelagem**, e **sem dado clínico do animal**.

Essa spec também resolve metade do conflito `[C2]`: na v1.0, saúde não consegue marcar consulta para dependente, "que é a maior parte do volume em odontologia". A outra metade (recurso compartilhado, sala ou consultório) continua adiada (`[PEN-23]`).

Dados de menores são protegidos pela LGPD (art. 14): exigem consentimento do responsável, cifra por campo (CONST IV) e o mínimo necessário para o atendimento.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.9 | Agendar para dependentes | % de agendamentos para terceiros |
| `[C2]` (parte) | Consulta para dependente em saúde | Agendamentos de dependentes em saúde |
| DF 4.2 | Vertical pet (banho, tosa, adestramento) | Tenants e agendamentos na vertical pet |

Personas: titular (quem agenda e paga); atendido (menor, adulto dependente, pet); Proprietário e equipe de estabelecimentos de saúde, beleza e pet.

---

## Clarifications

### Session 2026-11-25

- Q: Como ficam anotações e pacotes de atendidos? → A: Anotações (PEN-10 e PEN-05, decididos na spec 020): profissionais que atendem + Proprietário (Gerente se liberado); retenção de 5 anos. Pacote de N sessões entra na v1.0 (PEN-07, spec 006) e pode ser usado por atendidos com saldo do titular.
- Q: Para cadastrar um adulto como dependente, o que basta? → A: A declaração do titular de que tem autorização; se o titular informar o celular do adulto, ele recebe um aviso com a opção de recusar o vínculo.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar quem eu agendo (Priority: P1)

Como titular, quero cadastrar meus dependentes (filhos, pais) e meus pets uma vez, para escolher depois em qualquer agendamento.

**Why this priority**: tela "Para quem eu agendo" (DF 9.10); sem o cadastro, não há passo "para quem".

**Independent Test**: com um titular de teste, cadastrar um filho de 8 anos, a mãe de 75 anos e um cachorro, conferir os consentimentos pedidos e ver os três na lista.

**Acceptance Scenarios**:

1. **Given** "Para quem eu agendo", **When** o titular adiciona um menor, **Then** informa nome, data de nascimento e relação (filho, enteado, neto, tutelado, outro), e declara ser responsável legal, com consentimento específico do responsável para o tratamento dos dados do menor (LGPD art. 14), registrado com versão, data, aparelho e IP.
2. **Given** a adição de um adulto dependente, **When** o titular informa nome, data de nascimento e relação, **Then** o titular declara que tem autorização do adulto; se informar o celular do adulto, ele recebe um aviso com a opção de recusar o vínculo, e a recusa desfaz o vínculo.
3. **Given** a adição de um pet, **When** o titular preenche "Cadastro do pet" (DF 9.10), **Then** informa nome, espécie (cão ou gato), raça, porte (P, M, G, GG), pelagem (curta, média, longa, dupla), data de nascimento aproximada, foto opcional e cuidados de manejo (por exemplo, "medroso com secador"), sem nenhum dado clínico (`[D29]`).
4. **Given** a lista, **When** o titular edita ou remove um atendido, **Then** a mudança vale para agendamentos futuros; os passados continuam ligados ao atendido como era.
5. **Given** um titular, **When** tenta passar de 10 pessoas ou 10 pets, **Then** é recusado com orientação.

---

### User Story 2 - Agendar para outra pessoa ou para o pet (Priority: P1)

Como titular, quero escolher "para quem" é o agendamento e ver só os serviços que fazem sentido para aquele atendido, com a duração certa para o meu pet.

**Why this priority**: o passo "Agendar para quem" (DF 9.10, `[D28]`) e a regra de duração por porte e pelagem (`[D29]`).

**Independent Test**: agendar para o filho num consultório odontológico, para a mãe numa fisioterapia e para um cachorro G de pelagem longa num banho e tosa; conferir os serviços oferecidos, a duração reservada para o pet e o pagamento e os pontos no titular.

**Acceptance Scenarios**:

1. **Given** o início de um agendamento, **When** o titular tem atendidos cadastrados, **Then** o primeiro passo pergunta "para quem": ele mesmo ou um dos atendidos; pode cadastrar um novo ali mesmo.
2. **Given** o atendido escolhido, **When** a lista de serviços aparece, **Then** mostra só os serviços que aceitam aquele tipo de atendido (pessoa, menor, adulto dependente, pet e espécie), conforme o catálogo (REQ-CAT-007).
3. **Given** um serviço de pet com regra de duração (base por porte + acréscimo por pelagem, `[D29]`), **When** o pet é escolhido, **Then** a duração e o preço (se o serviço tiver preço por porte) são calculados para aquele pet e os horários livres consideram essa duração (spec 008).
4. **Given** o agendamento, **When** confirmado, **Then** o titular é quem paga (spec 012) e quem acumula os pontos (spec 015, REQ-FID-032), e o agendamento mostra o nome do atendido.
5. **Given** um agendamento para atendido, **When** o titular vê "Meus agendamentos" (spec 009), **Then** cada agendamento mostra para quem é.
6. **Given** um menor ou um pet, **When** o atendimento acontece, **Then** o estabelecimento vê, no atendimento, o nome do titular responsável e o contato dele.

---

### User Story 3 - Estabelecimento configura serviços por atendido e regras de duração (Priority: P1)

Como Proprietário, quero dizer para quais tipos de atendido cada serviço é oferecido e, na vertical pet, configurar a duração e o preço por porte e o acréscimo por pelagem.

**Why this priority**: sem essa configuração, a regra da `[D29]` não existe e menores e pets aparecem em serviços errados.

**Independent Test**: num pet shop de teste, configurar o banho com base de 30, 45, 60 e 90 minutos por porte e acréscimo de 0, 10, 20 e 30 minutos por pelagem, com preço por porte; conferir os valores calculados para 4 pets diferentes.

**Acceptance Scenarios**:

1. **Given** um serviço (spec 006), **When** o Proprietário edita, **Then** escolhe os tipos de atendido aceitos: o próprio consumidor, menor (com idade mínima e máxima opcionais), adulto dependente, pet (cão, gato).
2. **Given** um serviço de pet, **When** o Proprietário configura a regra de duração, **Then** informa a duração base para cada porte e o acréscimo para cada pelagem; a duração resultante segue as regras de múltiplos de 5 minutos da spec 006.
3. **Given** um serviço de pet, **When** o Proprietário configura preço por porte (opcional), **Then** o preço "a partir de" na página mostra o menor valor e o preço exato aparece quando o pet é escolhido.
4. **Given** a regra de duração e o preço por porte, **When** mudam, **Then** são versionados e os agendamentos existentes mantêm a versão congelada (CONST III).
5. **Given** a vertical pet (`[D29]`), **When** um negócio é criado nela (spec 005), **Then** usa as categorias banho e tosa e adestramento, com vocabulário "tutor" e "pet".

---

### User Story 4 - Ficha do pet e do dependente no estabelecimento (Priority: P2)

Como Recepção ou Colaborador, quero ver, no atendimento e na ficha, os dados necessários do atendido (porte, pelagem, cuidados do pet; nome e idade do menor) e o responsável.

**Why this priority**: tela "Ficha do pet" (DF 9.10); o estabelecimento precisa saber quem está atendendo sem receber dados além do necessário (DF 12).

**Independent Test**: abrir a ficha de um pet e a de um menor no painel, conferir os campos exibidos e que nenhum dado além do mínimo aparece.

**Acceptance Scenarios**:

1. **Given** a "Ficha do pet" no painel, **When** aberta, **Then** mostra nome, espécie, raça, porte, pelagem, idade aproximada, foto, cuidados de manejo, tutor (titular) e histórico de atendimentos no negócio.
2. **Given** um menor, **When** o estabelecimento abre o atendimento ou a ficha, **Then** vê só primeiro nome e sobrenome, idade (não a data de nascimento completa, salvo em saúde, onde a data pode ser exibida), o responsável e o contato dele; nunca documentos do menor.
3. **Given** anotações de atendimento (spec 020) de um menor ou adulto dependente, **When** escritas, **Then** ficam ligadas ao atendido, e o consentimento para anotações é dado pelo responsável (titular).
4. **Given** um pet, **When** o Colaborador quer registrar algo do atendimento (por exemplo, "nó na pelagem da pata traseira"), **Then** usa as anotações da spec 020, ligadas ao pet; a tela avisa que não é para registrar diagnóstico clínico.

---

### User Story 5 - Compartilhar um dependente ou um pet com outro responsável (Priority: P3)

Como titular, quero compartilhar o cadastro do meu filho ou do meu pet com outro responsável (por exemplo, o outro pai), para que ele também possa agendar.

**Why this priority**: guarda compartilhada e famílias com vários tutores são comuns; sem isso, surgem cadastros duplicados.

**Independent Test**: o titular A convida o titular B para o cadastro do filho; B aceita, agenda, paga e acumula pontos do próprio agendamento; A vê os agendamentos dos dois para o filho.

**Acceptance Scenarios**:

1. **Given** um atendido, **When** o titular convida outra pessoa pelo celular, **Then** ela recebe o convite e, ao aceitar com OTP, passa a ser corresponsável, podendo agendar.
2. **Given** dois responsáveis, **When** cada um agenda, **Then** quem agenda paga e acumula os pontos do próprio agendamento; ambos veem os agendamentos do atendido.
3. **Given** um corresponsável, **When** o titular original o remove, **Then** ele deixa de ver e de agendar; agendamentos futuros dele para o atendido continuam até serem cancelados por ele.

---

### Edge Cases

- **Menor que completa 18 anos**: o titular e o atendido (se houver celular) são avisados 30 dias antes; ao completar 18, o vínculo vira "adulto dependente" e a pessoa pode criar a própria conta e assumir o histórico, desligando-se do titular.
- **Atendido que cria a própria conta** (por exemplo, o pai idoso que passa a usar o app): pode pedir para assumir o próprio histórico; o titular é avisado, e os agendamentos passados continuam visíveis a ele só como "agendamento para {nome}", sem anotações.
- **Pedido de eliminação** (spec 022) feito pelo titular para um menor: atendido em nome do menor; feito pelo adulto dependente: atendido em nome dele.
- **Titular que exclui a conta**: os atendidos menores e os pets dele são eliminados conforme a spec 022; adultos dependentes com conta própria continuam.
- **Pet que morreu ou foi doado**: o titular arquiva o pet; o histórico fica, sem novos agendamentos.
- **Serviço sem tipo de atendido configurado**: vale "só o próprio consumidor" (comportamento da v1.0).
- **Combo com pet**: a regra de duração vale para cada etapa que tiver regra.
- **Dois pets no mesmo horário** (banho de dois cães): são dois agendamentos, cada um com a sua duração; a reserva segue a spec 008.
- **Avaliação de atendimento de dependente**: feita pelo titular (spec 016).

---

## Requirements *(mandatory)*

Formato: `REQ-ATD-NNN (origem: …)`.

### Functional Requirements

**Atendidos**

- **REQ-ATD-001** (origem: D28 | DF 6 fase 2 | CONST 2): O atendido (`service_subject`) DEVE ter tipo (menor, adulto dependente, pet), titular (responsável principal), corresponsáveis opcionais e estado (ativo, arquivado); fica na identidade global, ligado ao titular.
- **REQ-ATD-002** (origem: LGPD art. 14 | CONST IV): O cadastro de menor DEVE exigir declaração de responsabilidade legal e consentimento específico do responsável, registrados com versão, data, aparelho e IP; nome e data de nascimento do menor DEVEM ser cifrados (CONST IV).
- **REQ-ATD-003** (origem: D28 | LGPD art. 7): O cadastro de adulto dependente DEVE exigir a declaração de autorização pelo titular; se houver celular do adulto, ele DEVE receber aviso com opção de recusar o vínculo, e a recusa desfaz o vínculo e é registrada.
- **REQ-ATD-004** (origem: D29): O pet DEVE ter nome, espécie (cão ou gato), raça, porte (P, M, G, GG), pelagem (curta, média, longa, dupla), data de nascimento aproximada, foto opcional e cuidados de manejo; NÃO DEVE ter campos de dado clínico (vacinas, doenças, medicamentos).
- **REQ-ATD-005** (origem: edge case): Um titular DEVE ter no máximo 10 pessoas e 10 pets como atendidos.
- **REQ-ATD-006** (origem: CONST III): Mudanças no atendido valem para agendamentos futuros; agendamentos passados mantêm os dados da época (porte e pelagem congelados no agendamento).

**Agendamento**

- **REQ-ATD-010** (origem: D28 | DF 9.10 "Agendar para quem"): Para titulares com atendidos, o agendamento DEVE começar pelo passo "para quem", com opção de cadastrar um atendido novo sem sair do fluxo.
- **REQ-ATD-011** (origem: REQ-CAT-007): Só DEVEM ser oferecidos os serviços que aceitam o tipo do atendido escolhido (e, para menor, a faixa de idade, se configurada).
- **REQ-ATD-012** (origem: D29 | REQ-AGD-001): Para pet, a duração DEVE ser a base do porte mais o acréscimo da pelagem, e os horários livres DEVEM considerar essa duração; o preço por porte, quando configurado, DEVE ser aplicado.
- **REQ-ATD-013** (origem: D28 | REQ-FID-032): O titular (ou o corresponsável que agendou) DEVE ser quem paga e quem acumula os pontos.
- **REQ-ATD-014** (origem: D28): O agendamento DEVE registrar o atendido; "Meus agendamentos", avisos (spec 011) e a agenda do estabelecimento DEVEM mostrar para quem é.
- **REQ-ATD-015** (origem: C2 | D21): Serviços de saúde DEVEM aceitar menores e adultos dependentes como atendidos, resolvendo a parte "consulta para dependente" do `[C2]`; o recurso compartilhado continua adiado (`[PEN-23]`).

**Configuração no estabelecimento**

- **REQ-ATD-020** (origem: REQ-CAT-007): O Proprietário DEVE configurar, por serviço, os tipos de atendido aceitos (o próprio consumidor, menor com faixa de idade opcional, adulto dependente, pet por espécie); sem configuração, vale "só o próprio consumidor".
- **REQ-ATD-021** (origem: D29 | DF 6 `RegraDuracao`): Serviços de pet DEVEM aceitar regra de duração (base por porte, acréscimo por pelagem) e preço opcional por porte, versionados (CONST III).
- **REQ-ATD-022** (origem: D29 | DF 4.2): A vertical pet DEVE existir com as categorias banho e tosa e adestramento, sem veterinário, com vocabulário "tutor" e "pet".

**Ficha e dados exibidos ao estabelecimento**

- **REQ-ATD-030** (origem: DF 9.10 "Ficha do pet"): A ficha do pet DEVE mostrar os dados do REQ-ATD-004, o tutor e o histórico no negócio.
- **REQ-ATD-031** (origem: D28 | DF 12 | CONST IV): Para menores, o estabelecimento DEVE ver só nome, idade (data de nascimento só em saúde), responsável e contato do responsável; nunca documentos do menor.
- **REQ-ATD-032** (origem: REQ-ANO-050): Anotações e alertas de cuidado (spec 020) DEVEM ser ligados ao atendido; o consentimento é do responsável.

**Corresponsáveis e transições**

- **REQ-ATD-040** (origem: edge case): O titular DEVE poder convidar corresponsáveis pelo celular; o aceite exige OTP; o titular pode remover corresponsáveis.
- **REQ-ATD-041** (origem: LGPD art. 14 | art. 18): Ao completar 18 anos, o menor DEVE passar a adulto dependente, com aviso 30 dias antes, e poder criar a própria conta e assumir o próprio histórico.
- **REQ-ATD-042** (origem: CONST IV): O atendido que cria conta própria DEVE poder assumir o histórico; o titular continua vendo só os agendamentos passados, sem anotações.
- **REQ-ATD-043** (origem: REQ-PRI-005): Os contratos de exportação e eliminação da spec 022 DEVEM cobrir os atendidos, exercidos pelo responsável (menor e pet) ou pelo próprio adulto.

**Isolamento**

- **REQ-ATD-050** (origem: CONST II): Os cadastros de atendidos ficam na identidade global; o estabelecimento recebe, por agendamento, só os dados permitidos (REQ-ATD-030 e 031).

### Key Entities

- **Atendido** (`service_subject`): tipo, titular, corresponsáveis, estado, dados por tipo.
- **Pessoa atendida** (menor ou adulto dependente): nome (cifrado), data de nascimento (cifrada), relação com o titular, celular opcional (adulto).
- **Pet**: nome, espécie, raça, porte, pelagem, nascimento aproximado, foto, cuidados de manejo.
- **Consentimento do responsável**: atendido, titular, versão do texto, data, aparelho, IP.
- **Corresponsabilidade**: atendido, pessoa, convite, aceite, estado.
- **Regra de duração por atributo** (`RegraDuracao`, versionada): serviço, base por porte, acréscimo por pelagem, preço por porte opcional.
- **Tipos de atendido aceitos por serviço**: serviço, tipos, faixa de idade.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.10) | Código |
|---|---|---|
| App do consumidor | Para quem eu agendo (dependentes e pets) · Cadastro do pet · Agendar para quem | Registrados no plano |
| Web do consumidor | Gestão de atendidos e passo "para quem" | Registrados no plano (sem tela própria no protótipo) |
| Painel do cliente | Ficha do pet · tipos de atendido e regra de duração em "Serviços e preços" | Registrados no plano |
| App do colaborador e `/pro` | Atendido no detalhe do atendimento | Registrado no plano |

O convite a corresponsável e o aviso de maioridade não aparecem no protótipo; são telas novas.

---

## Regras e estados

- **Atendido**: `ativo` → `arquivado` (pet que morreu ou foi doado; dependente desligado) · menor → adulto dependente (aos 18) → `independente` (assumiu a própria conta).
- **Duração do pet**: base(porte) + acréscimo(pelagem), arredondada para o múltiplo de 5 minutos mais próximo acima.
- **Quem paga e acumula pontos**: quem agendou (titular ou corresponsável).
- **Dados exibidos ao estabelecimento**: pet — todos os do cadastro; menor — nome, idade, responsável; adulto dependente — nome, idade, responsável e, se houver, celular dele.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Nome e data de nascimento do menor | Pessoal de criança ou adolescente, cifrado | Consentimento do responsável (art. 14, §1) | Enquanto o vínculo existir; conforme spec 022 | Titular e corresponsáveis; estabelecimento (nome e idade) |
| Nome, data de nascimento e celular do adulto dependente | Pessoal, cifrado | Conforme decisão do REQ-ATD-003 | Idem | Titular; o próprio adulto; estabelecimento (nome, idade, celular se houver) |
| Dados do pet | Dado do titular (não pessoal do animal) | Execução de contrato | Enquanto o pet estiver ativo + histórico conforme spec 022 | Titular; estabelecimento com agendamento |
| Consentimentos do responsável | Pessoal | Obrigação de comprovar (art. 8) | Enquanto houver dado + 5 anos | Titular; Encarregado |
| Anotações sobre atendido (spec 020) | Sensível quando de saúde | Consentimento do responsável | Spec 020 | Spec 020 |

Regras: nenhum dado clínico de pet é coletado (`[D29]`); dados de menores nunca aparecem em vitrine, avaliações públicas, BI identificável ou avisos a terceiros; o atendido nunca é contatado pelo estabelecimento para marketing.

---

## Permissões

| Ação | Titular | Corresponsável | Adulto dependente | Recepção / Colaborador | Proprietário |
|---|---|---|---|---|---|
| Cadastrar, editar, arquivar atendido | ✔ | ✔ (editar e agendar) | ✔ (só os próprios dados) | — | — |
| Agendar para o atendido | ✔ | ✔ | — | ✔ (agendamento manual, informando o atendido) | ✔ |
| Convidar e remover corresponsável | ✔ | — | — | — | — |
| Ver ficha do pet e dados do menor no atendimento | — | — | — | ✔ (com agendamento) | ✔ |
| Configurar tipos de atendido e regra de duração | — | — | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `household.subject.created.v1` / `.updated.v1` / `.archived.v1` | Ciclo do atendido |
| `household.guardian_consent.granted.v1` / `.revoked.v1` | Consentimento do responsável |
| `household.co_guardian.joined.v1` / `.removed.v1` | Corresponsáveis |
| `household.subject.came_of_age.v1` / `.became_independent.v1` | Maioridade e independência |
| `catalog.duration_rule.published.v1` | Nova versão da regra de duração |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| % de agendamentos para terceiros | DF 3.1.9 | Acompanhada |
| Agendamentos de dependentes em saúde | `[C2]` | Acompanhada |
| Tenants e agendamentos na vertical pet | DF 4.2 | Acompanhada |
| Diferença entre a duração prevista e a real nos serviços de pet | `[D29]` | Acompanhada (ajuste da regra) |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O titular cadastra um pet ou um dependente em até 1 minuto.
- **SC-002**: O titular agenda para um atendido já cadastrado sem passos a mais além da escolha "para quem".
- **SC-003**: 100% dos agendamentos de pet reservam a duração da regra para o porte e a pelagem daquele pet.
- **SC-004**: Nenhum menor é cadastrado sem o consentimento do responsável, verificado por teste.
- **SC-005**: O estabelecimento nunca recebe dados de menor além de nome, idade e responsável (data de nascimento só em saúde), verificado por teste.
- **SC-006**: Nenhum campo de dado clínico de pet existe no cadastro.
- **SC-007**: 100% dos pagamentos e pontos de agendamentos para atendidos ficam com quem agendou.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| Consentimento do adulto dependente | Base legal; experiência do titular e do adulto | **Resolvido (clarify 2026-11-25)**: declaração + aviso com recusa |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **C2** — recurso compartilhado | `[PEN-23]` (adiado) | Esta spec resolve só a parte "dependente" do `[C2]` |
| **PEN-05** / **PEN-10** — anotações | Spec 020 | Decidido: seguem a spec 020 |
| **PEN-07** — pacotes | Spec 006 | Decidido (v1.0): pacotes usados por atendidos, com saldo do titular |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Limites | ASSUMIDO: 10 pessoas e 10 pets por titular |
| Espécies | ASSUMIDO: cão e gato na fase 2 |
| Menores | ASSUMIDO: todos os menores de 18 exigem consentimento do responsável |
| Duração | ASSUMIDO: arredondada para cima ao múltiplo de 5 minutos |

---

## Fora do escopo desta especificação

- Veterinário e qualquer dado clínico de animal (fora por ora, `[D36]`, e `[D29]`).
- Recurso compartilhado (sala, consultório, banheira) (`[PEN-23]`).
- Veículos como atendidos (fase 3, spec 033).
- Turmas e alunos (spec 026), que reusam o atendido quando o aluno é menor.
- Agendamento feito pelo próprio menor.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: cadastro em até 1 minuto; 10 pessoas e 10 pets por titular; aviso de maioridade 30 dias antes.
- Portes e pelagens seguem a classificação usual do setor de banho e tosa; a tabela pode ser ajustada pela Gestão.
- O estabelecimento de saúde pode precisar da data de nascimento do menor; nos demais, só a idade.
- O domínio dono desta spec é `household` (CONST 4.4, fase 2); a regra de duração pertence a `catalog`.
