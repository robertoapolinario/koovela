# Feature Specification: Favoritos

**Feature Branch**: `031-favoritos`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "031 favoritos — seguir a sequência da constituição (seção 10), fase 3. Depende de 024. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: app do consumidor ("Favoritos"; botão de favoritar na vitrine, na página do estabelecimento e no perfil do profissional) · web do consumidor (mesmas funções) · painel do cliente (contagem agregada de favoritos)

**Depende de**: 024 `vitrine-busca` (e, por ela, a v1.0 e a fase 2)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II e IV, seções 4.4 (`engagement`, "+3 favoritos") e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.1.8, 9.11, 15 e 17 (`[D36]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Com a vitrine (spec 024), o consumidor passa a descobrir vários estabelecimentos. Ele quer **guardar os que gostou** e **voltar ao mesmo profissional** (DF 3.1.8) sem precisar buscar de novo. Os favoritos entram na fase 3 (`[D36]`) e têm tela própria no protótipo (DF 9.11).

Favoritos são uma lista do consumidor, guardada na conta global dele; a Koovela é a controladora desses dados, como na vitrine (CONST IV). Um estabelecimento não pode usar o fato de ser favoritado para mandar promoção a ninguém: comunicação promocional continua exigindo o opt-in da spec 028.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.8 | Voltar ao mesmo profissional | % de agendamentos a partir de favoritos |
| 3.2.4 | Reter clientes | Recompra de quem favoritou |

Personas: consumidor; Proprietário (só números agregados).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Favoritar estabelecimentos e profissionais (Priority: P1)

Como consumidor, quero tocar num coração para guardar um estabelecimento (ou uma filial) e um profissional, de onde eu estiver: na vitrine, na página do estabelecimento ou no perfil do profissional.

**Why this priority**: é a função inteira; sem ela não há lista.

**Independent Test**: com uma conta de teste, favoritar dois estabelecimentos pela vitrine e um profissional pela página, desfavoritar um, e conferir a lista em "Favoritos" no app e na web.

**Acceptance Scenarios**:

1. **Given** um resultado da vitrine, a página do estabelecimento ou o perfil de um profissional, **When** o consumidor toca no coração, **Then** o item vai para os favoritos dele em até 1 segundo, e o coração fica preenchido em todas as telas.
2. **Given** um item favoritado, **When** o consumidor toca de novo, **Then** sai dos favoritos.
3. **Given** um consumidor sem conta, **When** toca no coração, **Then** é levado à etapa 1 do cadastro (spec 003) e, ao concluir, o item fica favoritado.
4. **Given** um consumidor, **When** tenta passar de 200 favoritos, **Then** é avisado do limite.

---

### User Story 2 - Usar os favoritos para agendar de novo (Priority: P1)

Como consumidor, quero abrir "Favoritos" e agendar com um toque no lugar ou com o profissional de que gosto, vendo o próximo horário livre.

**Why this priority**: é o ganho prático (DF 3.1.8).

**Independent Test**: abrir "Favoritos", conferir o próximo horário livre de cada item e agendar a partir de um profissional favorito.

**Acceptance Scenarios**:

1. **Given** "Favoritos", **When** aberta, **Then** mostra estabelecimentos e profissionais separados, com foto, nome, categoria, nota (quando pública, spec 016), distância (se o consumidor permitir a localização naquele momento) e o próximo horário livre.
2. **Given** um profissional favorito, **When** o consumidor toca em "agendar", **Then** o fluxo de agendamento abre já com o estabelecimento e o profissional escolhidos (spec 009).
3. **Given** um estabelecimento favorito que saiu da vitrine, foi despublicado ou está suspenso, **When** a lista é exibida, **Then** aparece como "indisponível no momento", sem link de agendamento; volta a ficar disponível quando ele voltar.
4. **Given** um profissional favorito que saiu do estabelecimento (spec 007), **When** a lista é exibida, **Then** aparece como "não atende mais aqui", com a opção de remover.

---

### User Story 3 - Estabelecimento sabe quantos o favoritaram (Priority: P3)

Como Proprietário, quero ver quantos consumidores favoritaram meu negócio e meus profissionais, sem saber quem são.

**Why this priority**: indicador de interesse útil, mas secundário.

**Independent Test**: com favoritos sintéticos, abrir o painel da vitrine (spec 024) e conferir as contagens, sem nomes.

**Acceptance Scenarios**:

1. **Given** o painel da vitrine (spec 024), **When** o Proprietário abre, **Then** vê o total de favoritos do negócio, de cada filial e de cada profissional, e a variação no mês.
2. **Given** as contagens, **When** são menores que 5, **Then** aparecem como "menos de 5".
3. **Given** um Proprietário, **When** procura saber quem favoritou, **Then** essa informação não existe no painel nem em nenhum relatório.

---

### Edge Cases

- **Consumidor que pede eliminação** (spec 022): os favoritos são apagados junto.
- **Favorito de estabelecimento de outra cidade**: continua na lista; a distância aparece só se houver localização.
- **Profissional em vários negócios** (spec 027): o favorito é do profissional naquele estabelecimento; não revela os outros vínculos dele.
- **Negócio de saúde com avaliações privadas** (specs 016 e 024): a lista não mostra nota.
- **Sem rede**: a lista mostra a última versão guardada no aparelho, sem horários livres.

---

## Requirements *(mandatory)*

Formato: `REQ-FAV-NNN (origem: …)`.

### Functional Requirements

- **REQ-FAV-001** (origem: D36 | DF 9.11): O consumidor DEVE poder favoritar e desfavoritar estabelecimentos (ou filiais) e profissionais (no contexto de um estabelecimento) a partir da vitrine, da página do estabelecimento e do perfil do profissional, no app e na web.
- **REQ-FAV-002** (origem: CONST II | CONST IV): Os favoritos DEVEM ficar na conta global do consumidor, com a Koovela como controladora, e nunca no espaço de dados de um tenant.
- **REQ-FAV-003** (origem: edge case): O limite DEVE ser de 200 favoritos por consumidor.
- **REQ-FAV-004** (origem: DF 3.1.8): "Favoritos" DEVE mostrar foto, nome, categoria, nota (quando pública), distância (só com localização permitida naquele momento) e o próximo horário livre (spec 008), e permitir agendar com o estabelecimento e o profissional já escolhidos.
- **REQ-FAV-005** (origem: REQ-VIT-033 | REQ-EQP-062): Itens indisponíveis (fora da vitrine, despublicados, suspensos) ou profissionais que saíram DEVEM aparecer como indisponíveis, sem link de agendamento.
- **REQ-FAV-006** (origem: CONST IV | REQ-CRM-001): Ser favoritado NÃO DEVE permitir ao estabelecimento enviar comunicação ao consumidor; campanhas seguem o opt-in da spec 028.
- **REQ-FAV-007** (origem: CONST IV): O estabelecimento DEVE ver só contagens agregadas por negócio, filial e profissional, com supressão abaixo de 5; nunca a identidade de quem favoritou.
- **REQ-FAV-008** (origem: REQ-PRI-005): Os favoritos DEVEM entrar na exportação e na eliminação da spec 022.
- **REQ-FAV-009** (origem: CONST XI): A lista DEVE ficar disponível sem rede com a última versão guardada no aparelho.
- **REQ-FAV-010** (origem: CONST 6): Favoritar ou desfavoritar DEVE refletir em todas as telas em até 1 segundo.

### Key Entities

- **Favorito**: consumidor, tipo (estabelecimento, filial ou profissional num estabelecimento), referência, data.
- **Contagem de favoritos** (agregada): negócio, filial, profissional, total, variação.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| App do consumidor | Favoritos | Registrado no plano |
| Web do consumidor | Favoritos (sem tela própria no protótipo) | Registrado no plano |
| Painel do cliente | Contagens no painel da vitrine (spec 024) | Registrado no plano |

---

## Regras e estados

- **Favorito**: `ativo` → `indisponível` (item fora da vitrine, despublicado, suspenso ou profissional que saiu) → `ativo` (voltou) · qualquer → removido pelo consumidor.
- **Contagens**: atualizadas a cada favoritar ou desfavoritar; abaixo de 5, "menos de 5".

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Lista de favoritos | Pessoal (preferências) | Execução de contrato com o consumidor (art. 7, V); Koovela controladora | Até o consumidor remover ou pedir eliminação | Só o próprio consumidor |
| Contagens agregadas | Não pessoal | — | Enquanto o negócio existir | Proprietário; Gestão (BI) |

---

## Permissões

| Ação | Usuário | Proprietário | Gerente |
|---|---|---|---|
| Favoritar, desfavoritar, ver a própria lista | ✔ | — | — |
| Ver contagens agregadas | — | ✔ | ✔ filial |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `engagement.favorite.added.v1` / `.removed.v1` | Favoritar e desfavoritar (sem dado pessoal além do pseudônimo) |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Consumidores com pelo menos um favorito | DF 3.1.8 | Acompanhada |
| % de agendamentos iniciados a partir de favoritos | DF 3.1.8 | Acompanhada |
| Recompra de consumidores com favorito x sem | DF 3.2.4 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O consumidor favorita um estabelecimento ou profissional em 1 toque, e a mudança aparece em todas as telas em até 1 segundo.
- **SC-002**: O consumidor agenda a partir de um favorito com o estabelecimento e o profissional já preenchidos, em até 3 toques até a escolha do horário.
- **SC-003**: Nenhum estabelecimento consegue saber quem o favoritou, verificado por teste.
- **SC-004**: 100% dos favoritos são apagados quando o consumidor pede eliminação.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-19** — avaliações públicas | Spec 016 | A nota só aparece quando pública |
| Participação na vitrine | Spec 024 | Favoritos de negócios fora da vitrine aparecem como indisponíveis |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Limite | ASSUMIDO: 200 favoritos por consumidor |
| Comunicação | ASSUMIDO: favoritar não dá direito de comunicação ao estabelecimento |
| Contagens | ASSUMIDO: só agregadas, com supressão abaixo de 5 |

---

## Fora do escopo desta especificação

- Listas compartilhadas ou coleções nomeadas.
- Avisos automáticos sobre favoritos (por exemplo, "abriu vaga com seu profissional favorito"); para isso há a fila de espera (spec 014) e as campanhas com opt-in (spec 028).
- Favoritar serviços isolados.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: 200 favoritos; reflexo em 1 segundo; supressão abaixo de 5.
- Favoritar exige conta (etapa 1), porque a lista fica na conta global.
- O domínio dono desta spec é `engagement` (CONST 4.4, "favoritos (fase 3)").
