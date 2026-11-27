# Feature Specification: Avaliações

**Feature Branch**: `016-avaliacoes`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "016 avaliacoes — seguir a sequência da constituição (seção 10). Depende de 009. Pendência PEN-19. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (base para a vitrine da fase 2, `[D26]`)

**Superfícies afetadas**: app do consumidor e web do consumidor ("Avaliação pós-atendimento"; avaliações na página do estabelecimento e do profissional) · painel do cliente ("Avaliações e respostas") · app do colaborador e `/pro` (avaliações próprias e resposta) · back-office (fila de moderação)

**Depende de**: 009 `agendamento-ciclo-de-vida` (e, por ela, 002 a 008); usa os avisos da 011

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, V, seções 5, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.1.5, 3.3.6, 6, 7, 8 (J1), 9.1, 9.3, 9.4, 9.8, 10.7, 12, 17 (`[D16]`, `[D26]`) e 18 (`[PEN-06]`, `[PEN-19]`, `[PEN-26]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O consumidor precisa "confiar em quem nunca atendeu" (DF 3.1.5), e o colaborador quer "construir reputação própria" (DF 3.3.6). Avaliações estão na v1.0 `[D16]` e fecham a J1 ("atendimento → avaliação → pontos creditados").

A regra que já está decidida é a que dá valor às avaliações da Koovela: **só quem teve um agendamento concluído pode avaliar** (DF 10.7). Não existe avaliação de quem não foi atendido.

O que falta decidir é o desenho público (`[PEN-19]`): se as avaliações são **públicas** na página do estabelecimento ou **privadas** para o tenant, **quem modera** e qual o **prazo de direito de resposta**. Na saúde, há um ponto a mais: conselhos profissionais costumam restringir depoimentos de pacientes em publicidade, o que liga esta spec ao `[PEN-06]`.

A partir da fase 2, as avaliações também alimentam a vitrine e a ordenação dos resultados (`[D26]`, `[PEN-26]`).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.5 | Confiar em quem nunca atendeu | Cobertura de avaliações |
| 3.3.6 | Construir reputação própria | Avaliações por colaborador |
| 3.2.4 | Reter clientes | Retorno após resposta a avaliação negativa |

Personas: consumidor; Colaborador; Proprietário e Gerente; Suporte (moderação).

---

## Clarifications

### Session 2026-11-25

- Q: Como ficam as avaliações em saúde? → A: Sempre privadas para o tenant (PEN-06, decidido na spec 005).
- Q: As avaliações são públicas ou privadas, e quem modera? (PEN-19) → A: Fora da saúde, públicas, mas o negócio decide se as mostra na própria página; a Koovela modera as denúncias; publicação 48 horas depois do envio, com ou sem resposta. Em saúde, sempre privadas (PEN-06).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor avalia depois do atendimento (Priority: P1)

Como consumidor, depois de ser atendido, quero dar uma nota e, se quiser, um comentário, em poucos segundos.

**Why this priority**: sem avaliação não há cobertura (DF 3.1.5) nem reputação (DF 3.3.6); é a tela "Avaliação pós-atendimento" da J1.

**Independent Test**: concluir um atendimento de teste, receber o pedido de avaliação, avaliar com 4 estrelas e um comentário, e conferir a avaliação no painel do estabelecimento.

**Acceptance Scenarios**:

1. **Given** um agendamento `CONCLUIDO` (spec 009), **When** passam 2 horas, **Then** o consumidor recebe o pedido de avaliação (spec 011), com o link direto para a avaliação.
2. **Given** a tela de avaliação, **When** o consumidor avalia, **Then** dá uma nota de 1 a 5 estrelas, pode marcar pontos fortes ou fracos (pontualidade, atendimento, resultado, ambiente) e escrever um comentário de até 1.000 caracteres.
3. **Given** um agendamento, **When** já foi avaliado, **Then** não pode ter outra avaliação; o consumidor pode editar a sua em até 14 dias.
4. **Given** um agendamento que não está `CONCLUIDO` (cancelado, não comparecimento, expirado), **When** alguém tenta avaliá-lo, **Then** é recusado.
5. **Given** o pedido de avaliação, **When** passam 14 dias sem resposta, **Then** o prazo encerra; um único lembrete é enviado no 3º dia.
6. **Given** o comentário, **When** o consumidor escreve, **Then** a tela avisa para não incluir dados pessoais nem de saúde.
7. **Given** um agendamento de combo, **When** avaliado, **Then** há uma única avaliação, ligada ao profissional do combo.

---

### User Story 2 - Avaliações visíveis para quem vai agendar (Priority: P1)

Como consumidor que ainda não conhece o estabelecimento, quero ver a nota média, a quantidade de avaliações e os comentários mais recentes, do estabelecimento e de cada profissional.

**Why this priority**: é o que transforma avaliação em confiança (DF 3.1.5) e reputação do colaborador (DF 3.3.6).

**Independent Test**: com 10 avaliações de teste num estabelecimento, abrir a página pública e o perfil do profissional, e conferir média, contagem e comentários conforme a regra de visibilidade.

**Acceptance Scenarios**:

1. **Given** a visibilidade das avaliações, **When** a página do estabelecimento é exibida, **Then** fora da saúde, as avaliações aparecem com nota e comentário se o negócio tiver escolhido mostrá-las (pode desligar a qualquer momento); a Koovela modera as denúncias; o estabelecimento pode responder a qualquer tempo, e a avaliação é publicada 48 horas depois de enviada, com ou sem resposta; em saúde, ficam sempre privadas (`[PEN-19]` resolvido).
2. **Given** avaliações públicas, **When** exibidas, **Then** mostram média (uma casa decimal) e quantidade dos últimos 12 meses, do estabelecimento, de cada filial e de cada profissional, e os comentários mais recentes primeiro, com o primeiro nome e a inicial do sobrenome do autor e o mês do atendimento.
3. **Given** menos de 5 avaliações num estabelecimento, filial ou profissional, **When** a página é exibida, **Then** a média não aparece; aparece "poucas avaliações ainda" e os comentários.
4. **Given** um negócio de saúde, **When** a página é exibida, **Then** as avaliações ficam sempre privadas para o tenant (`[PEN-06]` decidido na spec 005).
5. **Given** a avaliação com resposta do estabelecimento, **When** exibida, **Then** a resposta aparece logo abaixo, identificada como "resposta do estabelecimento".

---

### User Story 3 - Estabelecimento acompanha e responde (Priority: P1)

Como Proprietário, Gerente ou Colaborador, quero ver as avaliações, ser avisado das negativas e responder publicamente, para mostrar cuidado com o cliente.

**Why this priority**: tela "Avaliações e respostas" (DF 9.3); DF 7 ("Responder avaliação": Colaborador a própria, Gerente e Proprietário).

**Independent Test**: receber uma avaliação de 2 estrelas, conferir o aviso ao Proprietário e ao Colaborador, responder pelo painel e conferir a resposta na página pública.

**Acceptance Scenarios**:

1. **Given** "Avaliações e respostas", **When** o Proprietário abre, **Then** vê as avaliações por filial, profissional, nota e período, com média, distribuição das notas e as respondidas e não respondidas.
2. **Given** uma avaliação de 1 ou 2 estrelas, **When** recebida, **Then** o Proprietário, o Gerente da filial e o Colaborador do atendimento são avisados (spec 011).
3. **Given** uma avaliação, **When** o Proprietário, o Gerente da filial ou o Colaborador do atendimento responde, **Then** a resposta tem até 1.000 caracteres, é única por avaliação, pode ser editada em até 24 horas e aparece junto da avaliação.
4. **Given** a resposta, **When** publicada, **Then** o consumidor é avisado.
5. **Given** o estabelecimento, **When** quer remover uma avaliação negativa, **Then** não pode: só pode responder ou denunciá-la para moderação (História 4).
6. **Given** o Colaborador no app, **When** abre o perfil, **Then** vê as próprias avaliações, a média e pode responder às do próprio atendimento.

---

### User Story 4 - Moderação e denúncia (Priority: P2)

Como estabelecimento, quero denunciar uma avaliação que viola as regras (ofensa, dado pessoal, conteúdo fora do atendimento); como plataforma, quero que a moderação siga critérios públicos e não remova opiniões negativas legítimas.

**Why this priority**: sem moderação, as avaliações viram risco jurídico; com moderação sem critério, viram propaganda e perdem valor.

**Independent Test**: enviar uma avaliação com xingamento e telefone, conferir a retenção automática; denunciar outra avaliação negativa legítima e conferir que ela é mantida com a justificativa.

**Acceptance Scenarios**:

1. **Given** uma avaliação enviada, **When** contém palavras ofensivas, dados pessoais (telefone, e-mail, CPF, endereço), ou termos de saúde, **Then** fica retida para moderação antes de publicar, e o consumidor é avisado do motivo.
2. **Given** uma avaliação publicada, **When** o estabelecimento a denuncia com motivo da lista (ofensa ou discriminação, dado pessoal, conteúdo não relacionado ao atendimento, conflito de interesse, spam), **Then** ela entra na fila de moderação, continua visível até a decisão e a decisão sai em até 3 dias úteis.
3. **Given** a moderação, **When** decide, **Then** só remove ou edita trechos que violem os critérios publicados; nota baixa ou crítica ao serviço não é motivo de remoção; a decisão e o motivo ficam registrados e são comunicados ao estabelecimento e ao consumidor.
4. **Given** uma avaliação removida, **When** isso acontece, **Then** ela sai da média e da página, mas continua registrada para auditoria.
5. **Given** os critérios de moderação, **When** o consumidor ou o estabelecimento quer consultar, **Then** estão publicados nos termos de uso.

---

### User Story 5 - Proteção contra avaliações falsas (Priority: P2)

Como plataforma, quero impedir que a equipe avalie o próprio estabelecimento e detectar padrões de avaliações combinadas.

**Why this priority**: a credibilidade da nota é o valor da avaliação Koovela; sem proteção, a média vira peça de marketing.

**Independent Test**: tentar avaliar com uma conta de consumidor ligada à mesma pessoa de um membro da equipe, e conferir a recusa; gerar 10 avaliações 5 estrelas em um dia a partir de agendamentos manuais pagos no local e conferir o alerta.

**Acceptance Scenarios**:

1. **Given** uma pessoa que é membro da equipe do negócio (spec 003), **When** tenta avaliar um atendimento desse negócio pela conta de consumidor ligada a ela, **Then** é recusada.
2. **Given** um volume incomum de avaliações (mais de 3 vezes a média diária do negócio) vindas de agendamentos manuais pagos no local, **When** detectado, **Then** essas avaliações ficam retidas para moderação e a Gestão é alertada (spec 021).
3. **Given** a política de incentivo, **When** avaliada, **Then** a Koovela não dá pontos nem descontos por avaliar, e o estabelecimento não pode oferecer recompensa por avaliação pela plataforma.

---

### Edge Cases

- **Consumidor exclui a conta** (spec 003): as avaliações dele passam a aparecer como "cliente Koovela", sem nome; a nota continua na média.
- **Consumidor pede a remoção da própria avaliação**: removida da página e da média na hora; o registro fica para auditoria pelo prazo de retenção.
- **Profissional que saiu do negócio** (spec 007): as avaliações ficam no estabelecimento e no histórico do profissional; não aparecem mais no perfil público dele naquele negócio.
- **Negócio despublicado ou tenant suspenso**: as avaliações deixam de aparecer junto com a página.
- **Agendamento remarcado**: só o agendamento final concluído pode ser avaliado.
- **Avaliação de série recorrente** (spec 013): cada ocorrência concluída pode ser avaliada, mas o pedido só é enviado a cada 5 ocorrências para não cansar o consumidor.
- **Pré-cadastro feito pela Recepção** (spec 009): o pedido de avaliação é enviado; avaliar exige verificar o celular por OTP.
- **Nota sem comentário**: aceita; conta na média e não aparece na lista de comentários.
- **Avaliação editada depois da resposta**: a resposta continua, e a avaliação mostra "editada".

---

## Requirements *(mandatory)*

Formato: `REQ-AVA-NNN (origem: …)`.

### Functional Requirements

**Coleta**

- **REQ-AVA-001** (origem: DF 10.7 | D16): Só agendamento `CONCLUIDO` DEVE poder ser avaliado, uma única vez, pelo consumidor do agendamento.
- **REQ-AVA-002** (origem: J1): O pedido de avaliação DEVE ser enviado 2 horas após a conclusão (spec 011), com um lembrete no 3º dia; o prazo para avaliar DEVE ser de 14 dias.
- **REQ-AVA-003** (origem: D16): A avaliação DEVE ter nota de 1 a 5, marcações opcionais (pontualidade, atendimento, resultado, ambiente) e comentário opcional de até 1.000 caracteres, ligada ao estabelecimento, à filial, ao serviço e ao profissional do atendimento.
- **REQ-AVA-004** (origem: D16): O consumidor DEVE poder editar a avaliação em até 14 dias e removê-la a qualquer momento.
- **REQ-AVA-005** (origem: edge case): Em séries recorrentes, o pedido DEVE ser enviado a cada 5 ocorrências concluídas; o consumidor pode avaliar qualquer ocorrência concluída por iniciativa própria.

**Visibilidade**

- **REQ-AVA-010** (origem: PEN-19 | DF 10.7): Fora da saúde, as avaliações DEVEM ser públicas quando o negócio escolher mostrá-las na página (configuração ligada ou desligada pelo Proprietário); moderação pela Koovela; publicação 48 horas após o envio, com ou sem resposta. Em saúde, DEVEM ser privadas. Com a exibição desligada, a nota também não aparece na vitrine, nos favoritos nem no benchmark.
- **REQ-AVA-011** (origem: PEN-06 | CONST 5): Nas verticais de saúde, as avaliações DEVEM ser sempre privadas para o tenant.
- **REQ-AVA-012** (origem: DF 3.1.5 | DF 3.3.6): A página pública DEVE mostrar média (uma casa decimal) e quantidade dos últimos 12 meses do estabelecimento, de cada filial e de cada profissional, e os comentários, dos mais recentes aos mais antigos.
- **REQ-AVA-013** (origem: DF 3.1.5): Com menos de 5 avaliações, a média NÃO DEVE ser exibida.
- **REQ-AVA-014** (origem: CONST IV): O autor DEVE aparecer só com o primeiro nome e a inicial do sobrenome e o mês do atendimento; nunca com foto, celular ou e-mail.
- **REQ-AVA-015** (origem: D26 | PEN-26 | CONST VII): As médias e contagens DEVEM estar disponíveis por contrato para a vitrine da fase 2 (spec 024).

**Resposta**

- **REQ-AVA-020** (origem: DF 7 "Responder avaliação"): O Proprietário, o Gerente da filial e o Colaborador do atendimento DEVEM poder responder, uma vez por avaliação, com até 1.000 caracteres, editável em até 24 horas.
- **REQ-AVA-021** (origem: J1): Avaliações de 1 ou 2 estrelas DEVEM avisar o Proprietário, o Gerente da filial e o Colaborador do atendimento; toda resposta DEVE avisar o consumidor.
- **REQ-AVA-022** (origem: DF 10.7): O estabelecimento NÃO DEVE poder remover nem editar avaliações; só responder ou denunciar.

**Moderação**

- **REQ-AVA-030** (origem: PEN-19 | CONST 5 "Termos"): Os critérios de moderação DEVEM estar publicados nos termos de uso: ofensa ou discriminação, dado pessoal, dado de saúde, conteúdo não relacionado ao atendimento, conflito de interesse, spam. Nota baixa ou crítica ao serviço NÃO é motivo de remoção.
- **REQ-AVA-031** (origem: CONST IV): A triagem automática DEVE reter para moderação, antes de publicar, avaliações com termos ofensivos, dados pessoais ou termos de saúde, avisando o consumidor.
- **REQ-AVA-032** (origem: PEN-19): A denúncia pelo estabelecimento DEVE exigir motivo da lista; a avaliação denunciada continua visível até a decisão, que sai em até 3 dias úteis.
- **REQ-AVA-033** (origem: CONST V): Toda decisão de moderação DEVE ser registrada (moderador, motivo, decisão) na trilha de auditoria e comunicada ao estabelecimento e ao consumidor.
- **REQ-AVA-034** (origem: CONST V): Avaliações removidas saem da média e da página e continuam registradas para auditoria.

**Proteção contra fraude**

- **REQ-AVA-040** (origem: DF 12 antifraude): Uma pessoa que é membro da equipe do negócio NÃO DEVE poder avaliar atendimentos desse negócio.
- **REQ-AVA-041** (origem: DF 12): Volume de avaliações acima de 3 vezes a média diária do negócio vindo de agendamentos manuais pagos no local DEVE ser retido para moderação e gerar alerta à Gestão (spec 021).
- **REQ-AVA-042** (origem: CDC | DF 3.1.5): A plataforma NÃO DEVE oferecer nem permitir recompensa por avaliação.
- **REQ-AVA-043** (origem: REQ-AGE-042): Avaliar a partir de pré-cadastro DEVE exigir verificação do celular por OTP.

**Isolamento e eventos**

- **REQ-AVA-050** (origem: CONST II): Avaliações ficam no espaço de dados do tenant; as médias públicas e as da vitrine são projeções alimentadas por eventos.
- **REQ-AVA-051** (origem: CONST IX): Os eventos desta spec NÃO DEVEM conter o texto do comentário nem dados do autor, só identificadores e a nota.

### Key Entities

- **Avaliação** (`review`): agendamento, consumidor, estabelecimento, filial, serviço, profissional, nota, marcações, comentário, estado, datas de envio, edição e publicação.
- **Resposta**: avaliação, autor (membro da equipe), texto, data, edição.
- **Pedido de avaliação**: agendamento, envio, lembrete, prazo, estado.
- **Denúncia**: avaliação, estabelecimento, motivo, data, decisão.
- **Decisão de moderação**: avaliação, moderador, critério aplicado, decisão (mantida, editada, removida), data.
- **Média agregada** (projeção): estabelecimento, filial ou profissional, média dos últimos 12 meses, contagem, distribuição.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Avaliação pós-atendimento · avaliações na página do estabelecimento e na escolha de profissional | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Avaliação (janela) · avaliações na página | `W..` registrados no plano |
| Painel (DF 9.3) | Avaliações e respostas | Registrado no plano |
| App do colaborador (DF 9.4) | Perfil (avaliações próprias e resposta) | Registrado no plano |
| Back-office | Fila de moderação | Registrado no plano |

A denúncia pelo estabelecimento e a fila de moderação no back-office precisam ser conferidas no protótipo.

---

## Regras e estados

- **Avaliação**: `enviada` → `retida` (triagem automática ou volume incomum) → `publicada` | `removida` · `enviada` → `aguardando_resposta` (até 48 horas, se a decisão do PEN-19 mantiver o prazo) → `publicada` · `publicada` → `denunciada` (continua visível) → `publicada` | `editada_pela_moderação` | `removida` · qualquer → `removida_pelo_autor`.
- **Privada** (saúde, ou se o PEN-19 decidir por privadas): o mesmo ciclo, mas `publicada` significa visível só ao tenant.
- **Média**: avaliações publicadas dos últimos 12 meses; só exibida com 5 ou mais.
- **Resposta**: uma por avaliação; editável por 24 horas.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Nota, marcações e comentário | Pessoal (opinião do titular) | Consentimento ao enviar (art. 7, I) | Enquanto o autor não remover; removidas, 5 anos para auditoria | Público (se públicas); equipe do tenant; moderação |
| Nome exibido (primeiro nome e inicial) | Pessoal | Consentimento ao enviar | Igual à avaliação | Público (se públicas) |
| Ligação com o agendamento | Pessoal | Execução de contrato | Igual ao agendamento | Equipe do tenant; moderação |
| Resposta do estabelecimento | Pessoal (autor da equipe, exibido como "estabelecimento") | Execução de contrato | Igual à avaliação | Público (se públicas) |
| Denúncias e decisões | Pessoal | Legítimo interesse e exercício de direitos (art. 7, VI e IX) | 5 anos | Suporte; Proprietário; o autor da avaliação (decisão) |

Regras: o consumidor é informado, antes de enviar, de que a avaliação pode ficar pública e de como aparece; comentários com dado de saúde são retidos (REQ-AVA-031); nenhum dado do autor vai em eventos (REQ-AVA-051).

---

## Permissões

Recorte da matriz RBAC (DF 7):

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte |
|---|---|---|---|---|---|---|
| Avaliar o próprio atendimento; editar; remover | ✔ | — | — | — | — | — |
| Ver avaliações do negócio no painel | — | ✔ próprias | ✔ filial | ✔ filial | ✔ | ✔* |
| Responder avaliação | — | ✔ própria | — | ✔ filial | ✔ | — |
| Denunciar avaliação | — | ✔ própria | — | ✔ filial | ✔ | — |
| Moderar | — | — | — | — | — | ✔ (perfil Suporte, com registro) |

`✔*` = apenas em sessão de suporte (spec 003). A moderação é feita no back-office, fora de sessão de suporte.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `engagement.review.requested.v1` | Pedido de avaliação enviado |
| `engagement.review.submitted.v1` / `.edited.v1` / `.published.v1` / `.removed.v1` | Ciclo da avaliação |
| `engagement.review.responded.v1` | Resposta do estabelecimento |
| `engagement.review.reported.v1` / `.moderated.v1` | Denúncia e moderação |
| `engagement.rating.updated.v1` | Média recalculada (para a página e a vitrine) |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Cobertura de avaliações (avaliações / atendimentos concluídos) | DF 3.1.5 | Acompanhada; acima de 20% |
| Avaliações por colaborador e média | DF 3.3.6 | Acompanhada |
| Taxa e tempo de resposta do estabelecimento | DF 3.2.4 | Acompanhada |
| Retorno em 90 dias após avaliação negativa respondida x não respondida | DF 3.2.4 | Acompanhada |
| Denúncias, % mantidas e tempo de decisão | PEN-19 | Decisão em até 3 dias úteis |
| Avaliações retidas por suspeita de fraude | DF 12 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O consumidor avalia um atendimento em até 20 segundos a partir do pedido.
- **SC-002**: 100% das avaliações vêm de agendamentos concluídos, verificado por teste.
- **SC-003**: Pelo menos 20% dos atendimentos concluídos recebem avaliação, a partir do terceiro mês de cada tenant.
- **SC-004**: 100% das denúncias recebem decisão em até 3 dias úteis.
- **SC-005**: Nenhuma avaliação negativa legítima é removida por pedido do estabelecimento, verificado na auditoria de moderação.
- **SC-006**: Nenhum membro da equipe consegue avaliar o próprio negócio, em 100% dos testes.
- **SC-007**: Uma nova avaliação publicada aparece na média da página em até 5 minutos.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-19** — públicas ou privadas, quem modera, prazo de resposta | Página pública, vitrine, moderação, prazos | **Resolvido (clarify 2026-11-25)**: públicas se o negócio mostrar; Koovela modera |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-06** — publicidade em saúde | Spec 005 | Decidido: avaliações sempre privadas em saúde |
| **PEN-26** — critério de ordenação da vitrine | Spec 024 | Esta spec só fornece médias e contagens |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Pedido | ASSUMIDO: 2 horas após a conclusão, lembrete no 3º dia, prazo de 14 dias |
| Média | ASSUMIDO: últimos 12 meses, exibida a partir de 5 avaliações |
| Incentivo | ASSUMIDO: nenhuma recompensa por avaliar |
| Autor exibido | ASSUMIDO: primeiro nome e inicial do sobrenome |

---

## Fora do escopo desta especificação

- Ordenação e destaque na vitrine (specs 024 e 032).
- Avaliação do consumidor pelo estabelecimento.
- Fotos e vídeos nas avaliações.
- Importação de avaliações de outras plataformas.
- Antifraude completa e revisão de alertas (spec 021).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: pedido em 2 horas; prazo de 14 dias; edição em 14 dias; resposta de até 1.000 caracteres editável em 24 horas; média a partir de 5 avaliações; decisão de moderação em até 3 dias úteis; publicação em 48 horas (padrão provisório).
- A moderação é feita pelo perfil Suporte da Gestão, no back-office, com os critérios publicados.
- A triagem automática usa listas de termos mantidas pela Gestão; falsos positivos são liberados na moderação.
- O domínio dono desta spec é `engagement` (CONST 4.4).
