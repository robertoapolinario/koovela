# Feature Specification: Inteligência de mercado (benchmark para os tenants)

**Feature Branch**: `037-inteligencia-mercado`

**Created**: 2026-11-25

**Status**: Clarified

**Input**: User description: "037 inteligencia-mercado — seguir a sequência da constituição (seção 10), fase 3: [D39]. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: painel do cliente ("Inteligência de mercado") · back-office (configuração dos recortes e acompanhamento)

**Depende de**: 023 `bi-dashboards` (cópia analítica, definições de métricas e pseudonimização)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II ("o benchmark DEVE aplicar um recorte mínimo de estabelecimentos por região antes de mostrar qualquer número `[D39]`"; agregações entre tenants só por projeções), IV, seções 4.4 (`insights`: "benchmark anonimizado para tenants `[D39]`", fase 3) e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 5.2, 9.11 e 17 (`[D39]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O dono de um salão não sabe se o seu preço de corte está alto ou baixo para o bairro, se a sua taxa de faltas é normal, nem em que horários a região tem mais procura. A Koovela tem esses dados agregados de muitos estabelecimentos.

A decisão `[D39]` define:

- **benchmark só para os tenants**, mostrado **no painel**;
- **não vendido a terceiros**;
- **recorte mínimo de estabelecimentos por região** para anonimizar (CONST II).

Esta spec usa a cópia analítica da spec 023 e cria o domínio `insights` (CONST 4.4), que entra na fase 3. Dois cuidados guiam tudo: nenhum estabelecimento pode ser identificado pelos números, e o benchmark não pode virar meio de combinar preços entre concorrentes (Lei 12.529/2011, defesa da concorrência).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 5.2 | Inteligência de mercado como valor da assinatura | Negócios que abrem o benchmark por mês |
| 3.2.1 | Aumentar receita do estabelecimento | Ajustes feitos depois de ver o benchmark (pesquisa) |

Personas: Proprietário; Gerente (filial); Gestão e Dados da Koovela.

---

## Clarifications

### Session 2026-11-25

- Q: O benchmark vale em saúde? → A: Sem benchmark de preço em saúde (PEN-06); as demais métricas valem.
- Q: Quantos estabelecimentos, no mínimo, por recorte para publicar um número do benchmark? (D39) → A: 5 estabelecimentos, configurável no back-office, mantida a regra de dominância de 30%.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comparar o meu negócio com a região (Priority: P1)

Como Proprietário, quero ver como o meu negócio está em relação a estabelecimentos parecidos da minha região: preço, ocupação, faltas, tíquete e recompra.

**Why this priority**: tela "Inteligência de mercado" (DF 9.11); é a função inteira da `[D39]`.

**Independent Test**: com dados sintéticos de 30 estabelecimentos numa cidade, abrir o benchmark de um deles e conferir a posição em cada métrica e as faixas da região.

**Acceptance Scenarios**:

1. **Given** um negócio com assinatura que inclui o benchmark, **When** o Proprietário abre "Inteligência de mercado", **Then** escolhe a filial, a categoria e o período (últimos 90 dias por padrão) e vê, para cada métrica, o valor do seu negócio, a mediana da região e a faixa central (do 25º ao 75º percentil), com a sua posição.
2. **Given** as métricas, **When** exibidas, **Then** incluem: preço praticado por serviço típico da categoria, ocupação da agenda, taxa de faltas, cancelamentos tardios, tíquete médio, antecedência média dos agendamentos, recompra em 90 dias e nota média (se pública, spec 016).
3. **Given** cada métrica, **When** o Proprietário toca em "como é calculado", **Then** vê a definição versionada (spec 023), a região usada e quantos estabelecimentos entraram no recorte (como faixa, por exemplo "entre 20 e 50").
4. **Given** a região do negócio, **When** não há estabelecimentos suficientes no bairro, **Then** o recorte sobe para a zona e depois para a cidade, e o painel diz qual nível foi usado.
5. **Given** um recorte que não atinge o mínimo nem na cidade, **When** exibido, **Then** a métrica aparece como "dados insuficientes na sua região", sem nenhum número.

---

### User Story 2 - Ver a procura da região por dia e horário (Priority: P2)

Como Proprietário, quero saber em que dias e horários há mais procura na minha região, para ajustar a escala e as promoções de horários ociosos.

**Why this priority**: ajuda a ocupação (DF 3.3.1), mas é complementar à comparação.

**Independent Test**: com buscas e agendamentos sintéticos, abrir o mapa de procura e conferir os horários de pico da região e da filial lado a lado.

**Acceptance Scenarios**:

1. **Given** o benchmark, **When** o Proprietário abre "Procura na região", **Then** vê um mapa de calor por dia da semana e faixa de hora, com a procura relativa da região (agendamentos e buscas na vitrine) ao lado da ocupação da própria filial.
2. **Given** o mapa, **When** um horário tem procura alta na região e ocupação baixa na filial, **Then** ele é destacado como oportunidade, com atalho para a escala (spec 007) e para os horários ociosos (spec 014).
3. **Given** a procura, **When** calculada, **Then** é relativa (índice de 0 a 100), nunca em números absolutos por estabelecimento.

---

### User Story 3 - Recortes e proteção no back-office (Priority: P2)

Como Gestão de Dados, quero configurar o mínimo de estabelecimentos por recorte, as regiões e as métricas, e verificar que nenhum número publicado fura as regras.

**Why this priority**: é a garantia da `[D39]` e da CONST II.

**Independent Test**: no back-office, rodar a verificação de um mês sintético com um bairro de 4 estabelecimentos e um com um estabelecimento dominante; conferir que nenhum dos dois é publicado.

**Acceptance Scenarios**:

1. **Given** o back-office, **When** a Gestão configura, **Then** define o mínimo de estabelecimentos por recorte (padrão 5, REQ-INT-010), a regra de dominância, os níveis de região e as métricas ativas, versionados.
2. **Given** cada cálculo, **When** termina, **Then** uma verificação automática bloqueia a publicação de qualquer recorte abaixo do mínimo ou com estabelecimento dominante, e registra o bloqueio.
3. **Given** o acompanhamento, **When** a Gestão abre, **Then** vê a cobertura (percentual de negócios com benchmark disponível por categoria e cidade), recortes bloqueados e uso do painel.

---

### User Story 4 - Sair da base do benchmark (Priority: P3)

Como Proprietário, quero poder retirar os dados do meu negócio do benchmark, sabendo que então deixo de ver os números da região.

**Why this priority**: transparência e escolha do tenant; não é o fluxo principal.

**Independent Test**: num negócio de teste, desligar a participação e conferir que ele some dos cálculos seguintes e perde o acesso ao painel.

**Acceptance Scenarios**:

1. **Given** as configurações do negócio, **When** o Proprietário desliga "participar do benchmark", **Then** vê o aviso de que os dados deixam de entrar nos próximos cálculos e de que o painel fica indisponível (reciprocidade).
2. **Given** a saída, **When** o próximo cálculo roda, **Then** os dados do negócio não entram; os números já publicados não são refeitos.
3. **Given** a volta, **When** religada, **Then** o negócio volta a participar e ver o painel no próximo cálculo.

---

### Edge Cases

- **Negócio novo** (menos de `forming_days` de dados, valor inicial 30, configurável no back-office): vê os números da região, mas a própria posição aparece como "em formação".
- **Negócio com várias filiais em regiões diferentes**: cada filial é comparada com a sua região.
- **Categoria com poucos negócios na cidade** (por exemplo, dedetização): a métrica não aparece; não há subida para o estado.
- **Variação brusca** (um negócio grande entra ou sai da região): a regra de dominância é aplicada de novo a cada cálculo.
- **Verticais de saúde** (`[PEN-06]`, decidido na spec 005): não há benchmark de preço; as demais métricas valem.
- **Pedido de eliminação de titular** (spec 022): não afeta o benchmark, que não guarda dados pessoais; os agregados já seguem a pseudonimização da spec 023.

---

## Requirements *(mandatory)*

Formato: `REQ-INT-NNN (origem: …)`.

### Functional Requirements

**Painel**

- **REQ-INT-001** (origem: D39 | DF 9.11): O painel DEVE mostrar, por filial, categoria e período (padrão 90 dias), o valor do negócio, a mediana e a faixa central (25º a 75º percentil) da região, para as métricas ativas.
- **REQ-INT-002** (origem: D39): As métricas iniciais DEVEM ser: preço praticado por serviço típico, ocupação, faltas, cancelamentos tardios, tíquete médio, antecedência média, recompra em 90 dias e nota média (só se pública).
- **REQ-INT-003** (origem: REQ-BI-005): Cada métrica DEVE mostrar a definição versionada, o nível de região usado e a quantidade de estabelecimentos em faixa, nunca o número exato.
- **REQ-INT-004** (origem: D39): A região DEVE subir de bairro para zona e de zona para cidade até atingir o mínimo; sem mínimo na cidade, a métrica aparece como "dados insuficientes".
- **REQ-INT-005** (origem: DF 3.3.1): O mapa de procura DEVE mostrar um índice relativo (0 a 100) por dia e faixa de hora, ao lado da ocupação da filial, destacando oportunidades com atalhos para a escala e os horários ociosos.
- **REQ-INT-006** (origem: D39 | spec 019): O acesso DEVE depender do plano da assinatura, configurável no back-office.

**Anonimização e concorrência**

- **REQ-INT-010** (origem: D39 | CONST II): Nenhum número DEVE ser publicado para recorte (região + categoria) com menos de 5 estabelecimentos; o mínimo é configurável no back-office, nunca abaixo de 5.
- **REQ-INT-011** (origem: CONST II): Nenhum número DEVE ser publicado se um só estabelecimento responder por mais de 30% do valor da métrica no recorte (regra de dominância).
- **REQ-INT-012** (origem: CONST II): Uma verificação automática DEVE bloquear e registrar a publicação de qualquer recorte que fure os REQ-INT-010 e REQ-INT-011; DEVE existir teste que tente identificar um estabelecimento por diferença entre recortes vizinhos.
- **REQ-INT-013** (origem: Lei 12.529/2011): O benchmark DEVE usar só dados históricos, com pelo menos 30 dias entre o fim do período e a publicação; NÃO DEVE mostrar preços futuros, planos de preço de concorrentes nem recomendação de preço.
- **REQ-INT-014** (origem: CONST II | CONST 4.1): O cálculo DEVE ler só a cópia analítica (spec 023) e projeções, nunca o schema transacional dos tenants.
- **REQ-INT-015** (origem: CONST IV | REQ-BI-003): O benchmark NÃO DEVE conter dados pessoais de consumidores ou colaboradores.

**Uso e participação**

- **REQ-INT-020** (origem: D39): O benchmark NÃO DEVE ser vendido, exportado em dados brutos, oferecido por API nem compartilhado com terceiros; o painel permite só ver e baixar a própria comparação em PDF.
- **REQ-INT-021** (origem: D39): Todo negócio DEVE participar por padrão, conforme os termos de uso, e poder sair; quem sai deixa de entrar nos cálculos seguintes e perde o acesso ao painel.
- **REQ-INT-022** (origem: CONST XII): O cálculo DEVE rodar uma vez por semana, com o período móvel escolhido.

**Back-office**

- **REQ-INT-030** (origem: CONST 8): O mínimo por recorte, a regra de dominância, os níveis de região, as métricas ativas e as verticais excluídas DEVEM ser configuráveis no back-office, versionados.
- **REQ-INT-031** (origem: D39): O back-office DEVE mostrar cobertura por categoria e cidade, recortes bloqueados e uso do painel.
- **REQ-INT-032** (origem: CONST V): Mudanças de configuração e acessos de Gestão aos cálculos DEVEM gerar registro na trilha de auditoria.

### Key Entities

- **Recorte** (`benchmark_cut`): região (nível e identificador), categoria, período, quantidade de estabelecimentos (faixa), estado (publicado ou bloqueado).
- **Valor de benchmark**: recorte, métrica (versão), mediana, 25º e 75º percentis.
- **Posição do negócio**: filial, recorte, métrica, valor próprio, percentil.
- **Índice de procura**: recorte, dia da semana, faixa de hora, índice.
- **Configuração de benchmark** (versionada): mínimo, dominância, níveis de região, métricas, verticais excluídas, planos com acesso.
- **Participação**: negócio, ligada ou desligada, data.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| Painel do cliente | Inteligência de mercado | Registrado no plano |
| Back-office | Benchmark: recortes e cobertura (sem tela própria no protótipo) | Registrado no plano |

O mapa de procura e a opção de sair do benchmark precisam ser conferidos no protótipo.

---

## Regras e estados

- **Recorte**: `calculado` → `publicado` (passou na verificação) | `bloqueado` (abaixo do mínimo ou com dominância).
- **Região**: bairro → zona → cidade, até atingir o mínimo; nunca acima da cidade.
- **Participação**: `ligada` (padrão) ↔ `desligada`; efeito no próximo cálculo.

---

## Dados pessoais

Esta spec não trata dados pessoais. O benchmark usa só agregados da cópia analítica da spec 023, já pseudonimizada e sem nome, contato, documento, endereço ou texto livre. Os dados dos estabelecimentos são dados de negócio, tratados conforme os termos de uso da assinatura, com a Koovela como controladora dos agregados.

---

## Permissões

| Ação | Gerente | Proprietário | Gestão de Dados (Koovela) |
|---|---|---|---|
| Ver o benchmark | ✔ filial | ✔ | — |
| Baixar a própria comparação em PDF | ✔ filial | ✔ | — |
| Ligar ou desligar a participação | — | ✔ | — |
| Configurar recortes, métricas e acesso por plano | — | — | ✔ |
| Ver cobertura, bloqueios e uso | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `insights.benchmark.calculated.v1` | Cálculo semanal concluído |
| `insights.benchmark.cut_blocked.v1` | Recorte bloqueado na verificação |
| `insights.benchmark.participation_changed.v1` | Negócio entrou ou saiu da base |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Negócios que abrem o benchmark por mês | DF 5.2 | Acompanhada |
| Cobertura (negócios com benchmark disponível) | `[D39]` | Acompanhada |
| Recortes publicados que furaram as regras | CONST II | 0 |
| Negócios que saíram da base | `[D39]` | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, nenhum número é publicado para recorte abaixo do mínimo ou com estabelecimento dominante.
- **SC-002**: Nenhum teste de reidentificação por diferença entre recortes vizinhos consegue isolar um estabelecimento.
- **SC-003**: O Proprietário encontra a posição do seu negócio numa métrica em até 3 toques a partir do painel.
- **SC-004**: 100% dos números mostrados têm definição, nível de região e faixa de estabelecimentos visíveis.
- **SC-005**: Nenhum dado do benchmark sai da plataforma além do PDF da própria comparação, verificado por teste.

---

## Pendências e conflitos

### Bloqueantes

| Item | Pergunta | Decisão (clarify 2026-11-25) |
|---|---|---|
| Mínimo por recorte (`[D39]`) | Quantos estabelecimentos, no mínimo, para publicar um número? | 5 estabelecimentos, configurável |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-19** — avaliações públicas | Spec 016 | A nota só entra se pública |
| **PEN-06** — restrições de saúde | Spec 005 | Decidido: sem benchmark de preço em saúde |
| **PEN-26** — regiões abertas | Spec 024 | Os níveis de região usam o mesmo cadastro de regiões |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Dominância | ASSUMIDO: nenhum estabelecimento acima de 30% da métrica no recorte |
| Defasagem | ASSUMIDO: 30 dias entre o fim do período e a publicação |
| Participação | ASSUMIDO: por padrão, com saída e reciprocidade |
| Frequência | ASSUMIDO: cálculo semanal, período padrão de 90 dias |

---

## Fora do escopo desta especificação

- Venda de dados, relatórios para terceiros ou API de benchmark (proibidos pela `[D39]`).
- Recomendação automática de preço.
- Comparação com estabelecimentos nomeados.
- Benchmark para consumidores na vitrine.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: mínimo de 5 estabelecimentos (clarify 2026-11-25); dominância de 30%; defasagem de 30 dias; período de 90 dias; posição em até 3 toques.
- "Zona" é um agrupamento de bairros cadastrado no back-office, o mesmo usado pela vitrine (spec 024).
- O domínio dono é `insights` (CONST 4.4), que só lê a cópia analítica do componente `bi/` (spec 023).
