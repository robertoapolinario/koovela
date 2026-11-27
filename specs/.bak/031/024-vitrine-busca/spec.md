# Feature Specification: Vitrine e busca

**Feature Branch**: `024-vitrine-busca`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "024 vitrine-busca — seguir a sequência da constituição (seção 10), fase 2: vitrine e busca [D26] (Koovela como controladora LGPD). Depende de 005, 006, 016 e 022. Pendência PEN-26. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 2 (em todas as plataformas, `[D35]`)

**Superfícies afetadas**: app do consumidor (nova aba "Início" com a vitrine, resultados, agendamento simplificado) · web do consumidor e site público `koovela.com` (home da vitrine, resultados com filtros e mapa, agendamento simplificado, páginas de categoria e cidade) · painel do cliente (participação na vitrine e desempenho) · back-office (regiões, verticais e moderação de conteúdo da vitrine)

**Depende de**: 005 `negocio-filiais-onboarding` · 006 `catalogo` · 016 `avaliacoes` · 022 `privacidade-direitos-titular` (e, por elas, a v1.0 inteira)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, VII, XI, seções 2, 3 (`koovela.com`), 4.4 (`discovery`), 6, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 1.1, 2.1, 3.1.1, 3.2.2, 4, 5.2, 5.3, 9.10, 12, 14, 16, 17 (`[D01]`, `[D26]`, `[D35]`, `[D37]`) e 18 (`[PEN-06]`, `[PEN-26]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Na v1.0, o consumidor só chega a um estabelecimento pelo link ou QR dele (DF 1.1). A decisão `[D26]` antecipa para a fase 2 a **vitrine com busca e verticais**: o consumidor pode "encontrar prestadores de várias categorias" (DF 3.1.1) e o estabelecimento ganha um canal para "aumentar o volume de clientes" (DF 3.2.2).

Isso muda três coisas (DF 5.3, DF 12):

- a Koovela passa a também **atrair consumidores** (aquisição B2B2C), não só vender ferramenta;
- a Koovela passa a ser **controladora** dos dados de quem chega pela busca, o que exige a política de privacidade revista **antes da fase 2** (CONST IV);
- a vitrine precisa de uma **base mínima de estabelecimentos por região** para não parecer vazia (DF 16).

A tensão entre SaaS e marketplace (DF 5.3) continua: pela `[D01]`, "o consumidor é do estabelecimento". A vitrine não pode virar um lugar onde o estabelecimento que paga a ferramenta perde o cliente para o vizinho.

Duas decisões estão abertas: o **critério de ordenação** dos resultados e a **base mínima** para abrir uma região (`[PEN-26]`). O destaque pago, em faixa separada, é da fase 3 (`[D37]`, spec 032).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.1 | Encontrar prestadores de várias categorias | Busca com resultado relevante |
| 3.2.2 | Aumentar volume de clientes | Novos consumidores únicos/mês (origem vitrine) |
| DF 14 (fase 2) | Conversão da vitrine | Busca → agendamento |
| DF 16 | Vitrine vazia em regiões com poucos estabelecimentos | Regiões abertas só com base mínima |

Personas: consumidor que busca; Proprietário (participação na vitrine); Gestão (regiões, verticais, moderação).

---

## Clarifications

### Session 2026-11-25

- Q: Como os negócios de saúde aparecem na vitrine? → A: Saúde (PEN-06, decidido na spec 005): o preço nunca aparece em nenhum lugar; taxa de agendamento fixa abatida do valor do atendimento; fica restrito só o que mostra preço. Aparecem sem preço e sem avaliações públicas; destaque pago permitido sem preço.
- Q: Qual o critério de ordenação e a base mínima para abrir uma região? (PEN-26) → A: Tudo configurável no back-office (critérios, pesos e mínimos); os valores iniciais são os da spec: relevância, distância, disponibilidade em 7 dias e avaliação ponderada; região com 15 estabelecimentos em 3 km ou 5 por categoria.
- Q: A participação na vitrine é automática ou opt-in? → A: Opt-in: o negócio só entra se o Proprietário ativar, com convite quando a região abrir.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar e encontrar perto de mim (Priority: P1)

Como consumidor, quero buscar um serviço (por exemplo, "manicure" ou "fisioterapia"), uma categoria ou um estabelecimento pelo nome, perto de onde estou ou de um endereço, e ver os resultados com nota, distância, preço a partir de e o próximo horário livre.

**Why this priority**: é a função da vitrine (DF 3.1.1); sem busca relevante, nada mais da spec importa.

**Independent Test**: numa região aberta com 30 estabelecimentos sintéticos de várias verticais, buscar por serviço, por categoria e por nome, com e sem localização, e conferir que os resultados são do tipo certo, dentro do raio, com as informações e na ordem da regra.

**Acceptance Scenarios**:

1. **Given** a aba "Início" no app ou a home `koovela.com`, **When** o consumidor digita um termo, **Then** vê sugestões de serviços, categorias e estabelecimentos enquanto digita, tolerando erros de digitação e sinônimos comuns (por exemplo, "unha" → manicure e pedicure).
2. **Given** a localização, **When** o consumidor permite usar a localização do aparelho, **Then** a busca usa esse ponto; se não permitir, informa bairro ou cidade (convertidos pela base local do IBGE, sem serviço externo; endereço completo só numa versão posterior, com conversão self-hosted); a localização nunca é pedida antes de ele tocar em "perto de mim".
3. **Given** os resultados, **When** exibidos, **Then** cada estabelecimento (ou filial) mostra nome, categoria, distância, nota média e quantidade de avaliações (spec 016, quando públicas), "a partir de R$ X" para o serviço buscado (respeitando o `[PEN-06]` em saúde), o próximo horário livre (spec 008) e uma foto.
4. **Given** a ordem dos resultados, **When** calculada, **Then** segue os critérios e pesos configurados no back-office (`[PEN-26]` resolvido: tudo configurável); valores iniciais: relevância para o termo, depois distância, disponibilidade nos próximos 7 dias e avaliação (com peso para quantidade; só quando o negócio mostra avaliações); região aberta com pelo menos 15 estabelecimentos ativos na vitrine em 3 km, ou 5 por categoria.
5. **Given** os resultados, **When** a busca é feita, **Then** responde em até 1 segundo (p95).
6. **Given** nenhum resultado, **When** isso acontece, **Then** o consumidor vê sugestões próximas (categoria parecida, raio maior) e nunca uma tela vazia sem saída.

---

### User Story 2 - Filtrar, comparar e ver no mapa (Priority: P1)

Como consumidor, quero filtrar por "disponível hoje", preço, nota, distância e características (atende em domicílio, aceita Pix, acessível), e ver os resultados num mapa.

**Why this priority**: telas "resultados com filtros e mapa" (DF 9.10).

**Independent Test**: aplicar cada filtro numa busca de teste e conferir a lista e o mapa; alternar entre lista e mapa sem perder a busca.

**Acceptance Scenarios**:

1. **Given** os resultados, **When** o consumidor aplica filtros (disponível hoje, disponível amanhã, faixa de preço, nota mínima, distância máxima, categoria, aceita pagamento online, acessibilidade declarada), **Then** a lista e o mapa se atualizam em até 1 segundo.
2. **Given** o mapa, **When** o consumidor move ou aproxima, **Then** os resultados da área visível aparecem; tocar num ponto abre o resumo do estabelecimento.
3. **Given** o endereço de um autônomo que atende em casa e escolheu ocultar o endereço (REQ-NEG-051), **When** exibido no mapa, **Then** aparece só a área aproximada do bairro, nunca o ponto exato.
4. **Given** a ordem e os filtros, **When** o consumidor quer entender, **Then** um link "como ordenamos os resultados" explica os critérios em linguagem simples, e que não há resultado pago na lista principal.

---

### User Story 3 - Agendar em uma tela (Priority: P1)

Como consumidor que encontrou um lugar pela vitrine, quero escolher serviço, profissional e horário numa tela só e confirmar, sem passar por várias páginas.

**Why this priority**: tela "agendamento simplificado em uma tela" (DF 9.10); a conversão busca → agendamento é a métrica da vitrine (DF 14).

**Independent Test**: a partir de um resultado, agendar um serviço em uma tela, conferir que o agendamento passa pelo mesmo fluxo da spec 009 (política, pagamento, confirmação) com origem "vitrine".

**Acceptance Scenarios**:

1. **Given** um resultado, **When** o consumidor toca em "agendar", **Then** vê numa tela: serviços do estabelecimento (o buscado em destaque), profissionais, os próximos horários livres e o resumo com preço e política.
2. **Given** a escolha, **When** confirmada, **Then** segue o fluxo normal de agendamento (specs 008, 009, 010, 012), com origem "vitrine" registrada.
3. **Given** um consumidor sem conta, **When** confirma, **Then** faz a etapa 1 do cadastro (spec 003) sem sair da tela.
4. **Given** o estabelecimento, **When** o consumidor quer saber mais, **Then** pode abrir a página completa do estabelecimento (spec 005) a partir da tela.

---

### User Story 4 - Estabelecimento escolhe aparecer e acompanha o resultado (Priority: P2)

Como Proprietário, quero decidir se meu negócio aparece na vitrine, completar o que falta para aparecer bem, e ver quantos clientes novos chegaram por ela.

**Why this priority**: sem estabelecimentos na vitrine não há vitrine; e a tensão SaaS × marketplace (DF 5.3) exige que o estabelecimento tenha controle.

**Independent Test**: num tenant de teste, conferir o estado de participação, completar os itens pendentes, sair e voltar da vitrine, e ver o painel de resultados com os agendamentos de origem "vitrine".

**Acceptance Scenarios**:

1. **Given** um negócio publicado (spec 005), **When** a vitrine abre na região dele, **Then** o negócio só aparece se o Proprietário tiver ativado a participação (opt-in); quando a região abre, ele recebe o convite para ativar.
2. **Given** os requisitos para aparecer (foto de capa, pelo menos 3 serviços com preço ou a regra de saúde, horário, endereço com geolocalização, pelo menos um profissional com horário), **When** o Proprietário abre "Vitrine" no painel, **Then** vê o que falta e uma prévia de como aparece.
3. **Given** um negócio na vitrine, **When** o Proprietário abre o painel da vitrine, **Then** vê por mês: aparições na busca, visitas à página vindas da vitrine, agendamentos com origem "vitrine" e novos consumidores únicos.
4. **Given** o Proprietário, **When** sai da vitrine, **Then** o negócio deixa de aparecer em até 15 minutos; a página por link e QR continua funcionando.

---

### User Story 5 - Regiões, verticais e páginas de categoria (Priority: P2)

Como Gestão, quero abrir a vitrine por região só quando houver base mínima, organizar as verticais e as categorias, e ter páginas de categoria e cidade que apareçam nos buscadores.

**Why this priority**: DF 16 (vitrine vazia) e DF 5.3 (aquisição B2B2C).

**Independent Test**: no back-office, ver as regiões candidatas com a contagem de estabelecimentos, abrir uma, e conferir as páginas `koovela.com/{cidade}/{categoria}` geradas e indexáveis.

**Acceptance Scenarios**:

1. **Given** o back-office, **When** a Gestão abre "Regiões da vitrine", **Then** vê, por cidade e bairro, quantos estabelecimentos ativos participam por categoria, e quais regiões atingem a base mínima (`[PEN-26]`).
2. **Given** uma região aberta, **When** um consumidor fora dela busca, **Then** vê os resultados mais próximos e o aviso de que a região ainda está chegando, com opção de ser avisado quando abrir.
3. **Given** as verticais da v1.0 e da fase 2 (beleza, saúde, pet, bem-estar), **When** a Gestão organiza, **Then** define as categorias, os sinônimos de busca e a ordem na home da vitrine.
4. **Given** uma região aberta, **When** as páginas de categoria e cidade são geradas, **Then** ficam em endereços estáveis sob `koovela.com`, pré-renderizadas, indexáveis, com LCP abaixo de 2,5 s em 4G (CONST 6), sem conflitar com os slugs de negócio (spec 005).

---

### User Story 6 - Privacidade de quem chega pela busca (Priority: P1)

Como consumidor, quero saber que a Koovela é responsável pelos meus dados de busca e localização, e controlar o uso deles.

**Why this priority**: com a vitrine, a Koovela vira controladora (DF 12, CONST IV); a política revista precisa estar publicada antes da fase 2.

**Independent Test**: fazer buscas de teste com e sem login, e conferir que a localização não é guardada, que o histórico de busca só existe com consentimento, e que tudo aparece na exportação da spec 022.

**Acceptance Scenarios**:

1. **Given** a primeira busca, **When** o consumidor usa a vitrine, **Then** a política de privacidade revista (Koovela como controladora) está publicada e acessível na tela.
2. **Given** a localização do aparelho, **When** usada, **Then** serve só para aquela busca e não é guardada; o último bairro escolhido pode ser lembrado no aparelho.
3. **Given** o histórico de buscas, **When** o consumidor tem conta, **Then** só é guardado se ele ativar "lembrar minhas buscas" (padrão: desligado), e entra na exportação e na eliminação (spec 022).
4. **Given** o site público, **When** acessado, **Then** só usa cookies estritamente necessários sem consentimento; qualquer medição além disso exige consentimento por banner, com recusa tão fácil quanto aceite.
5. **Given** um consumidor que chegou pela vitrine e agendou, **When** o agendamento é criado, **Then** os dados do agendamento passam a ser tratados pelo estabelecimento como controlador, como em qualquer agendamento (spec 009).

---

### Edge Cases

- **Saúde** (`[PEN-06]`, decidido na spec 005): o estabelecimento aparece na vitrine (se fez opt-in) sem nenhum preço, sem filtro por preço e sem avaliações públicas (spec 016); mostra a taxa de agendamento fixa. Com filtro de preço ou de nota ativo, os negócios de saúde saem da lista e um aviso explica que saúde não mostra preço nem nota.
- **Estabelecimento suspenso, despublicado ou sem horários nos próximos 30 dias**: sai da vitrine em até 15 minutos.
- **Rede com várias filiais**: cada filial aparece como resultado próprio, com o nome do negócio.
- **Autônomo que atende em domicílio** (`service_location_mode`, fase 3): o filtro "atende em domicílio" só aparece quando a fase 3 existir; até lá, todos são "no estabelecimento".
- **Termo ofensivo ou ilegal na busca**: nenhum resultado, sem sugestão.
- **Conteúdo do estabelecimento inadequado** (foto, descrição): denúncia pelo consumidor e moderação no back-office; o negócio pode ser retirado da vitrine com aviso.
- **Empate na ordenação**: desempate estável e rotativo entre estabelecimentos equivalentes, para não favorecer sempre o mesmo.
- **Estabelecimento novo sem avaliações**: não é penalizado pela falta de nota nos primeiros 60 dias; aparece com "novo na Koovela".
- **Volume**: com 10 mil estabelecimentos e 100 buscas por segundo, a busca continua em até 1 segundo (p95).

---

## Requirements *(mandatory)*

Formato: `REQ-VIT-NNN (origem: …)`.

### Functional Requirements

**Busca e resultados**

- **REQ-VIT-001** (origem: D26 | DF 3.1.1): A busca DEVE aceitar serviço, categoria e nome de estabelecimento, com sugestões enquanto o consumidor digita, tolerância a erros de digitação e sinônimos mantidos pela Gestão.
- **REQ-VIT-002** (origem: CONST IV): A localização do aparelho DEVE ser pedida só quando o consumidor tocar em "perto de mim", usada só naquela busca e nunca guardada no servidor; a alternativa é informar bairro ou cidade, convertidos pela base local do IBGE (nenhum texto digitado vai a serviço externo).
- **REQ-VIT-003** (origem: DF 9.10): Cada resultado DEVE mostrar nome, categoria, distância, nota e quantidade de avaliações (quando públicas, spec 016), preço a partir de (respeitando o `[PEN-06]`), próximo horário livre (spec 008) e foto.
- **REQ-VIT-004** (origem: PEN-26): Critérios, pesos de ordenação e base mínima por região DEVEM ser configuráveis no back-office, versionados, sem valor fixo no código; valores iniciais: relevância, distância, disponibilidade em 7 dias e avaliação ponderada; região com 15 estabelecimentos em 3 km ou 5 por categoria.
- **REQ-VIT-005** (origem: CDC | D37): A lista principal NÃO DEVE ter resultado pago; os critérios de ordenação DEVEM estar explicados ao consumidor em linguagem simples. O destaque pago da fase 3 fica em faixa separada e identificada (spec 032).
- **REQ-VIT-006** (origem: edge case): Empates DEVEM ter desempate estável e rotativo; estabelecimentos novos sem avaliações NÃO DEVEM ser penalizados nos primeiros 60 dias.
- **REQ-VIT-007** (origem: CONST 6): A busca DEVE responder em até 1 segundo (p95), com 10 mil estabelecimentos e 100 buscas por segundo.
- **REQ-VIT-008** (origem: DF 3.1.1): Sem resultados, a tela DEVE oferecer alternativas (categoria parecida, raio maior), nunca uma tela vazia.

**Filtros e mapa**

- **REQ-VIT-010** (origem: DF 9.10): Os filtros DEVEM incluir: disponível hoje, disponível amanhã, faixa de preço, nota mínima, distância máxima, categoria, aceita pagamento online e acessibilidade declarada; lista e mapa se atualizam em até 1 segundo.
- **REQ-VIT-011** (origem: DF 9.10): O mapa DEVE mostrar os resultados da área visível; endereços ocultados pelo autônomo DEVEM aparecer só como área aproximada.
- **REQ-VIT-012** (origem: CONST 2 | D40): O modelo DEVE aceitar o filtro "atende em domicílio" da fase 3, sem exibi-lo antes de a função existir.

**Agendamento simplificado**

- **REQ-VIT-020** (origem: DF 9.10): A partir de um resultado, o consumidor DEVE poder escolher serviço, profissional e horário e ver o resumo numa única tela.
- **REQ-VIT-021** (origem: CONST VII | REQ-AGE-010): O agendamento DEVE seguir o fluxo das specs 008, 009, 010 e 012, com origem "vitrine"; nenhuma regra de agenda, política ou pagamento é reimplementada.
- **REQ-VIT-022** (origem: D26 | DF 5.2): Agendamentos de origem "vitrine" NÃO DEVEM ter taxa adicional ao tenant na fase 2, além da taxa por agendamento do plano (spec 019).

**Participação do estabelecimento**

- **REQ-VIT-030** (origem: D01 | DF 5.3): A participação na vitrine DEVE ser opt-in pelo Proprietário, com convite quando a região abrir e saída a qualquer momento.
- **REQ-VIT-031** (origem: DF 16): Para aparecer, o negócio DEVE ter foto de capa, pelo menos 3 serviços com preço (ou a regra de saúde), horário, endereço com geolocalização e pelo menos um profissional com horário; o painel DEVE mostrar o que falta e uma prévia.
- **REQ-VIT-032** (origem: DF 3.2.2): O painel DEVE mostrar por mês aparições, visitas vindas da vitrine, agendamentos de origem "vitrine" e novos consumidores únicos.
- **REQ-VIT-033** (origem: CONST 6): Sair da vitrine, despublicar, ficar sem horários por 30 dias ou ser suspenso DEVE tirar o negócio da vitrine em até 15 minutos; link e QR continuam funcionando.

**Regiões, verticais e SEO**

- **REQ-VIT-040** (origem: DF 16 | PEN-26): O back-office DEVE mostrar, por cidade e bairro, os participantes por categoria e as regiões que atingem a base mínima, e permitir abrir e fechar regiões.
- **REQ-VIT-041** (origem: D26): Fora de uma região aberta, a busca DEVE mostrar os resultados mais próximos e permitir pedir aviso quando a região abrir.
- **REQ-VIT-042** (origem: DF 4 | D26): A Gestão DEVE manter verticais, categorias, sinônimos e a ordem da home da vitrine.
- **REQ-VIT-043** (origem: CONST 3 | CONST 6): Páginas de categoria e cidade DEVEM ficar em endereços estáveis sob `koovela.com`, pré-renderizadas, indexáveis, com LCP abaixo de 2,5 s em 4G, sem colidir com slugs de negócio (os nomes de cidade e categoria entram na lista de reservados da spec 005).
- **REQ-VIT-044** (origem: CONST XI): A vitrine DEVE cumprir WCAG 2.1 AA e funcionar em 3G, carregando texto antes das imagens.

**Moderação e privacidade**

- **REQ-VIT-050** (origem: CONST 5): O consumidor DEVE poder denunciar conteúdo de um estabelecimento na vitrine; a Gestão modera no back-office e pode retirar o negócio da vitrine com aviso e registro na trilha de auditoria.
- **REQ-VIT-051** (origem: CONST IV | DF 12): A política de privacidade revista, com a Koovela como controladora dos dados da vitrine, DEVE estar publicada antes de a vitrine abrir (REQ-PRI-063).
- **REQ-VIT-052** (origem: CONST IV): O histórico de buscas só DEVE ser guardado com "lembrar minhas buscas" ligado (padrão: desligado) e DEVE entrar na exportação e na eliminação (spec 022).
- **REQ-VIT-053** (origem: CONST IV): O site público DEVE usar só cookies estritamente necessários sem consentimento; medição adicional exige consentimento com recusa tão fácil quanto aceite.
- **REQ-VIT-054** (origem: CONST II): O índice da vitrine DEVE ser uma projeção alimentada por eventos das specs 005, 006, 007, 008 e 016, com só dados públicos dos negócios; nunca uma consulta aos espaços de dados dos tenants.
- **REQ-VIT-055** (origem: CONST IV): Termos ofensivos ou ilegais na busca NÃO DEVEM gerar resultados nem sugestões.

### Key Entities

- **Índice da vitrine** (projeção global): negócio, filial, categoria, localização (ou área aproximada), serviços e preços públicos, nota e contagem, próximo horário livre, características, participação, estado.
- **Região**: cidade, bairro ou área, contagens por categoria, estado (candidata, aberta, fechada).
- **Vertical e categoria**: nome, sinônimos, ordem, regras de exibição (por exemplo, saúde).
- **Critérios de ordenação** (versionados): pesos, regras de desempate, vigência.
- **Participação na vitrine**: negócio, estado, data, requisitos pendentes.
- **Pedido de aviso de região**: consumidor (com a etapa 1 do cadastro; sem e-mail solto), região, data.
- **Denúncia de conteúdo**: negócio, motivo, autor, decisão.
- **Histórico de buscas** (opcional, com consentimento): consumidor, termo, data.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.10) | Código |
|---|---|---|
| App do consumidor | Home vitrine (aba "Início") · Resultados da busca · Agendamento simplificado em uma tela | Registrados no plano |
| Web do consumidor | Home vitrine · Resultados com filtros e mapa · Agendamento simplificado | Registrados no plano |
| Painel do cliente | Participação na vitrine e desempenho | Registrado no plano (tela nova) |
| Back-office | Regiões da vitrine · verticais e sinônimos · moderação | Registrados no plano (telas novas) |

---

## Regras e estados

- **Participação**: `não_participa` → `convidado` (região aberta) → `pendente` (requisitos faltando) → `ativo` ↔ `pausado` (sem horários, suspenso, despublicado) · `ativo` → `saiu` (decisão do Proprietário) · `ativo` → `retirado` (moderação).
- **Região**: `candidata` → `aberta` ↔ `fechada`.
- **Lista principal**: só resultados orgânicos; nenhum resultado pago.
- **Atualização do índice**: mudanças de negócio, catálogo, horário, avaliações e participação aparecem em até 15 minutos.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Localização do aparelho na busca | Pessoal | Consentimento no momento do uso (art. 7, I) | Não guardada no servidor | Ninguém |
| Bairro ou endereço informado | Pessoal | Execução do serviço de busca | Só no aparelho | O próprio consumidor |
| Histórico de buscas (opcional) | Pessoal | Consentimento (art. 7, I) | 12 meses ou até desligar | O próprio consumidor |
| Eventos de busca e clique (agregados) | Pseudonimizado | Legítimo interesse (art. 7, IX) | 3 anos (spec 023) | Gestão (agregado); Proprietário (agregado do próprio negócio) |
| Pedido de aviso de região | Pessoal | Consentimento | Até a região abrir + 30 dias | Gestão |
| Dados públicos do negócio no índice | Dado da empresa; pessoal para autônomo (nome, foto) | Execução de contrato e consentimento do Proprietário na participação | Enquanto participar | Público |

Regras: a Koovela é controladora dos dados da vitrine (DF 12); ao agendar, os dados do agendamento passam ao estabelecimento como controlador (spec 009); a vitrine nunca mostra dados de consumidores.

---

## Permissões

| Ação | Usuário | Proprietário | Gerente | Suporte | Comercial/Growth | SRE |
|---|---|---|---|---|---|---|
| Buscar, filtrar, agendar, denunciar conteúdo | ✔ | — | — | — | — | — |
| Ativar e sair da vitrine; ver o painel da vitrine | — | ✔ | ✔ filial (leitura) | ✔* | — | — |
| Abrir e fechar regiões; manter verticais e sinônimos | — | — | — | — | ✔ | ✔ |
| Configurar critérios de ordenação | — | — | — | — | ✔ (com aprovação do responsável pelo produto) | ✔ |
| Moderar conteúdo e retirar negócio da vitrine | — | — | — | ✔ | — | — |

`✔*` = apenas em sessão de suporte (spec 003).

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `discovery.listing.activated.v1` / `.paused.v1` / `.left.v1` / `.removed.v1` | Participação na vitrine |
| `discovery.region.opened.v1` / `.closed.v1` | Regiões |
| `discovery.search.performed.v1` | Busca (agregável, sem PII) |
| `discovery.result.clicked.v1` | Clique em resultado (agregável, sem PII) |
| `discovery.ranking.version_published.v1` | Novos critérios de ordenação |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Conversão busca → agendamento | DF 14 (fase 2) | Acompanhada |
| Buscas com pelo menos um resultado clicado | DF 3.1.1 | Acompanhada; acima de 60% |
| Novos consumidores únicos por mês com origem vitrine | DF 3.2.2 | Acompanhada |
| Estabelecimentos ativos na vitrine por região | DF 16 | Acompanhada |
| Tempo de resposta da busca (p95) | REQ-VIT-007 | Até 1 s |
| Saídas da vitrine por mês e motivo | DF 5.3 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% das buscas respondem em até 1 segundo.
- **SC-002**: O consumidor vai da busca à confirmação do agendamento em até 2 minutos (mediana), com conta.
- **SC-003**: Nenhuma região é aberta sem a base mínima configurada.
- **SC-004**: Nenhum resultado pago aparece na lista principal, verificado por teste.
- **SC-005**: Nenhuma localização de aparelho é guardada no servidor, verificado por teste.
- **SC-006**: Um negócio que sai da vitrine deixa de aparecer em até 15 minutos.
- **SC-007**: As páginas de categoria e cidade carregam com LCP abaixo de 2,5 s em 4G para 75% das visitas.
- **SC-008**: O Proprietário vê, no painel, os agendamentos e clientes novos vindos da vitrine no mês em até 2 toques.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-26** — critério de ordenação e base mínima por região | Ordem dos resultados; abertura de regiões | **Resolvido (clarify 2026-11-25)**: tudo configurável |
| Participação automática ou opt-in (`[D01]` × `[D26]`) | Tamanho da vitrine; relação com o estabelecimento | **Resolvido (clarify 2026-11-25)**: opt-in |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-06** — publicidade e preço em saúde | Spec 005 | Decidido: sem preço e sem avaliações públicas |
| **PEN-19** — avaliações públicas | Spec 016 | A vitrine só mostra notas se forem públicas |
| **D37** — destaque pago | Spec 032 | Faixa separada e identificada, fora da lista principal |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Taxa | ASSUMIDO: sem taxa adicional para agendamentos de origem vitrine na fase 2 |
| Localização | ASSUMIDO: usada só na busca, nunca guardada |
| Histórico de buscas | ASSUMIDO: desligado por padrão |
| Estabelecimento novo | ASSUMIDO: sem penalidade por falta de avaliações por 60 dias |

---

## Fora do escopo desta especificação

- Destaque pago (spec 032) e favoritos (spec 031).
- Atendimento no endereço e orçamentos (spec 033).
- Recomendações personalizadas por histórico.
- Marketplace de produtos (escopo negativo, CONST 2).
- Busca por profissional individual entre estabelecimentos (portabilidade do colaborador, fora por ora, `[D36]`).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: busca em até 1 segundo com 10 mil estabelecimentos e 100 buscas por segundo; índice atualizado em até 15 minutos; base mínima provisória de 15 estabelecimentos em 3 km ou 5 por categoria; histórico de buscas por 12 meses; 60 dias sem penalidade para estabelecimentos novos; busca até agendamento em 2 minutos.
- A vitrine reutiliza a página do estabelecimento da spec 005 e o fluxo de agendamento da spec 009.
- As páginas de cidade e categoria usam nomes que entram na lista de slugs reservados da spec 005.
- O domínio dono desta spec é `discovery` (CONST 4.4, fase 2).
