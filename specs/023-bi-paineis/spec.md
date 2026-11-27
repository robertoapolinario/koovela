# Feature Specification: Painéis de BI e dashboards do estabelecimento

**Feature Branch**: `023-bi-paineis`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "023 bi-paineis — seguir a sequência da constituição (seção 10): operacional, financeiro, coorte. Depende de 012. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para as métricas da fase 2 e para o benchmark da fase 3, `[D39]`)

**Superfícies afetadas**: BI (`bi.koovela.com`: painéis operacional, financeiro e de coorte e retenção, para a Gestão) · painel do cliente ("Dashboard da filial" e "Dashboard consolidado da rede")

**Depende de**: 012 `pagamentos-split` (e, por ela, 002 a 011); lê eventos e projeções de todas as specs da v1.0

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, VII, IX, seções 3 (`bi.koovela.com`), 4.1 (BI), 6, 7 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.2, 3.4, 9.3, 9.6, 11.1, 14 e 17 (`[D25]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A Koovela definiu uma North Star, **atendimentos concluídos e pagos por mês**, e uma árvore de métricas por camada: aquisição, ativação, engajamento, qualidade, retenção, monetização e operação (DF 14). A constituição exige que algumas sejam medidas **desde o primeiro tenant**: taxa de instalação do app, parcela de agendamentos pela web, no-show com e sem lembrete, e incidentes de reserva dupla (CONST 7). Cada spec anterior já declarou os eventos e as métricas que produz.

Esta spec junta tudo em painéis:

- **Painéis de BI da Gestão** (DF 9.6, `[D25]`): operacional, financeiro e de coorte e retenção, em `bi.koovela.com`, atrás de autenticação de borda;
- **Dashboards do estabelecimento** no painel (DF 9.3): "Dashboard da filial" e "Dashboard consolidado da rede", que nenhuma outra spec cobre.

Duas regras da constituição moldam a spec: o BI **nunca lê o banco transacional** — só réplica ou cópia analítica (CONST 4.1); e agregações entre tenants **leem projeções construídas a partir de eventos** (CONST II).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 14 | Todas as camadas de métricas | North Star e métricas por camada |
| 3.4.1 | Gestão técnica da plataforma | Cobertura de observabilidade; custo de infra por tenant |
| 3.2.1 / 3.2.3 / 3.2.4 | Receita, ocupação e retenção do estabelecimento | Receita por filial; ocupação; recompra |
| CONST 7 | Métricas desde o primeiro tenant | Instalação do app; agendamentos pela web; no-show com e sem lembrete; reserva dupla |

Personas: Gestão (Financeiro/Ops, Comercial/Growth, SRE, e o responsável pelo produto); Proprietário e Gerente (dashboards do estabelecimento).

---

## Clarifications

### Session 2026-11-25

- Q: O "tenant ativado" do BI é o mesmo critério dos parceiros? → A: Não: no BI, tenant ativado é o que tem o primeiro atendimento concluído e pago; para pagar parceiros (spec 038, PEN-30), vale a primeira assinatura paga.
- Q: O Gerente vê a receita nos dashboards? → A: Gerente (PEN-03, decidido na spec 003): vê faturamento e configura fidelidade só da própria filial; o Proprietário pode retirar. Taxa por agendamento (PEN-09, decidido na spec 012): retida no split nos pagamentos pela plataforma; na fatura nos pagamentos no local.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Painel operacional da Gestão (Priority: P1)

Como responsável pelo produto ou SRE, quero ver a North Star, a ativação, o engajamento, a qualidade e a operação da plataforma, por período, vertical e região, para saber se o produto está funcionando.

**Why this priority**: DF 14 e CONST 7; sem isso, nenhuma decisão de produto é medida.

**Independent Test**: com dados sintéticos de 20 tenants e 3 meses, abrir o painel operacional e conferir que cada métrica bate com a contagem feita direto nos eventos de origem.

**Acceptance Scenarios**:

1. **Given** o painel operacional, **When** aberto, **Then** mostra por mês: atendimentos concluídos e pagos (North Star); tenants ativados; % de tenants com primeiro agendamento em 7 dias; taxa de instalação do app pelo consumidor; parcela de agendamentos pela web e quantos desses consumidores instalaram o app depois; ocupação da agenda; agendamentos por tenant ativo; no-show com e sem lembrete entregue; avaliação média; incidentes de reserva dupla.
2. **Given** filtros, **When** aplicados (período, vertical, categoria, cidade, plano, coorte de ativação), **Then** todas as métricas se recalculam.
3. **Given** a camada de operação, **When** exibida, **Then** mostra MTTR, custo de infraestrutura por tenant (custo mensal informado ÷ tenants ativos) e falhas de migração por release (spec 002).
4. **Given** qualquer métrica, **When** o usuário passa o cursor ou toca nela, **Then** vê a definição exata (o que conta, o que não conta) e a origem.

---

### User Story 2 - Painel financeiro da Gestão (Priority: P1)

Como Financeiro/Ops, quero ver GMV, receita da Koovela por fonte, take rate efetivo, ARPA, inadimplência, margem por tenant e chargebacks, com números que batem com o financeiro de origem.

**Why this priority**: camada de monetização do DF 14; base para decidir preços (`[PEN-08]`).

**Independent Test**: com um mês de pagamentos e faturas sintéticos, abrir o painel financeiro e conferir que GMV, receita por fonte e inadimplência batem, ao centavo, com as specs 012 e 019 para o mês fechado.

**Acceptance Scenarios**:

1. **Given** o painel financeiro, **When** aberto, **Then** mostra por mês: GMV (pela plataforma e registrado no local, separados); receita da Koovela por fonte (assinatura, taxa por agendamento, take rate, taxa de horário ocioso); take rate efetivo; ARPA; NRR; inadimplência e recuperação (spec 019); chargebacks e perda por fraude / GMV (spec 021).
2. **Given** um mês fechado, **When** o painel mostra os totais, **Then** batem ao centavo com a conciliação da spec 012 e com as faturas da spec 019; diferença gera alerta ao Financeiro/Ops.
3. **Given** a margem por tenant, **When** calculada, **Then** é a receita da Koovela com o tenant menos os custos atribuídos (envios de SMS e e-mail, taxas de emissão fiscal se houver, parte do custo de infraestrutura), com o método explicado.
4. **Given** o CAC por canal, **When** exibido, **Then** usa o gasto por canal informado mensalmente pelo Comercial/Growth no BI e os tenants ativados por canal de origem.

---

### User Story 3 - Painel de coorte e retenção (Priority: P1)

Como responsável pelo produto e Comercial/Growth, quero ver a retenção de tenants e de consumidores por coorte, para saber se o produto segura quem entra.

**Why this priority**: camada de retenção do DF 14 (churn de tenant, NRR, recompra do consumidor em 90 dias).

**Independent Test**: com coortes sintéticas, conferir a matriz de retenção de tenants por mês de ativação e a curva de recompra de consumidores em 30, 60 e 90 dias, contra cálculo feito direto nos eventos.

**Acceptance Scenarios**:

1. **Given** a coorte de tenants por mês de ativação, **When** exibida, **Then** mostra, mês a mês, % de tenants ainda ativos (pagando) e a receita relativa ao mês de entrada (NRR por coorte).
2. **Given** a coorte de consumidores por mês do primeiro agendamento, **When** exibida, **Then** mostra recompra em 30, 60 e 90 dias, no mesmo estabelecimento e na plataforma.
3. **Given** filtros, **When** aplicados (vertical, plano, canal de aquisição, com ou sem fidelidade, com ou sem app), **Then** as coortes se recalculam.
4. **Given** uma célula da coorte, **When** tem menos de 5 tenants ou consumidores, **Then** o valor não é mostrado (aparece "poucos dados").

---

### User Story 4 - Dashboard da filial e da rede (Priority: P2)

Como Proprietário ou Gerente, quero abrir o painel e ver como está a minha filial (e, como Proprietário, a rede): agendamentos de hoje e da semana, ocupação, receita, faltas, novos clientes, recompra e avaliações.

**Why this priority**: telas "Dashboard da filial" e "Dashboard consolidado da rede" (DF 9.3); são a primeira coisa que o estabelecimento vê no painel.

**Independent Test**: num tenant de teste com duas filiais e dados de um mês, abrir o dashboard como Gerente de uma filial e como Proprietário, e conferir números, recortes e permissões.

**Acceptance Scenarios**:

1. **Given** o Dashboard da filial, **When** aberto, **Then** mostra: agendamentos de hoje e da semana; ocupação da agenda por colaborador; receita do período (conforme permissão); não comparecimentos e cancelamentos tardios; novos consumidores; recompra em 30, 60 e 90 dias; avaliação média; serviços e profissionais mais agendados; e a origem dos agendamentos (link, QR, direto, manual, fila, horário ocioso).
2. **Given** o Dashboard consolidado da rede, **When** o Proprietário abre, **Then** vê os mesmos indicadores por filial lado a lado e no total da rede.
3. **Given** um Gerente, **When** abre o dashboard, **Then** vê só a própria filial; a receita aparece só da própria filial (`[PEN-03]` decidido na spec 003).
4. **Given** os números, **When** exibidos, **Then** se atualizam em até 15 minutos e mostram a hora da última atualização.
5. **Given** os dados do estabelecimento, **When** exibidos, **Then** vêm só do próprio tenant (CONST II).

---

### User Story 5 - Confiar nos números (Priority: P2)

Como Gestão, quero saber se os dados dos painéis estão atualizados e corretos, e ser avisado quando algo atrasar ou divergir.

**Why this priority**: número errado no BI leva a decisão errada; com um desenvolvedor, a falha precisa ser visível sem investigação.

**Independent Test**: parar a alimentação do BI de propósito por 2 horas e conferir o aviso nos painéis e o alerta ao SRE; criar uma divergência entre o BI e a origem e conferir o alerta.

**Acceptance Scenarios**:

1. **Given** cada painel, **When** exibido, **Then** mostra a hora da última atualização dos dados.
2. **Given** a alimentação atrasada mais de 2 horas (painéis da Gestão) ou 30 minutos (dashboards do estabelecimento), **When** isso acontece, **Then** os painéis mostram o aviso e o SRE recebe alerta (spec 001).
3. **Given** a verificação diária, **When** roda, **Then** compara totais do BI (agendamentos concluídos, pagamentos, faturas) com as fontes; divergência acima de 0,5% (ou qualquer divergência em valores financeiros de mês fechado) gera alerta.
4. **Given** a definição de cada métrica, **When** alterada, **Then** fica versionada, com data, e o painel indica a mudança.

---

### Edge Cases

- **Tenant suspenso ou arquivado**: continua no histórico dos painéis da Gestão; sai das contagens de "ativos".
- **Agendamento estornado depois do mês fechado**: o mês fechado não muda nos números financeiros; o estorno aparece no mês em que aconteceu, e o painel mostra a diferença de forma explícita.
- **Pagamento no local**: entra no GMV separado de "pela plataforma"; não entra no take rate.
- **Consumidor que pediu eliminação** (spec 022): os eventos dele ficam só como contagens anonimizadas; nada no BI identifica a pessoa.
- **Fuso**: métricas por dia usam a data local da filial.
- **Tenant com uma filial e um colaborador** (autônomo): o dashboard esconde comparações que não fazem sentido (ranking de profissionais, comparação entre filiais).
- **Métricas da fase 2** (turmas, vale-presente, vitrine, campanhas) e **benchmark da fase 3** (`[D39]`): entram como novas métricas nas specs donas, usando o mesmo modelo; nenhuma métrica da fase 2 aparece antes de a função existir.
- **Volume**: com 500 tenants e 50 mil agendamentos por mês (CONST 6), os painéis da Gestão respondem em até 5 segundos; com 10× o volume, em até 15 segundos.

---

## Requirements *(mandatory)*

Formato: `REQ-BI-NNN (origem: …)`.

### Functional Requirements

**Dados**

- **REQ-BI-001** (origem: D25 | CONST 4.1): Os painéis DEVEM ler só de uma cópia analítica (ou réplica), nunca do banco transacional.
- **REQ-BI-002** (origem: CONST II | CONST IX): A cópia analítica DEVE ser alimentada pelos eventos de domínio das specs (e por extrações periódicas das projeções, quando preciso), com atraso de até 1 hora para os painéis da Gestão e de até 15 minutos para os dashboards do estabelecimento.
- **REQ-BI-003** (origem: CONST IV): A cópia analítica NÃO DEVE conter nome, celular, e-mail, CPF, endereço, anotações nem textos livres; consumidores e colaboradores aparecem só por pseudônimo.
- **REQ-BI-004** (origem: CONST IV | REQ-PRI-005): A cópia analítica DEVE oferecer o contrato de eliminação da spec 022: os pseudônimos de titulares que pediram eliminação são desligados de qualquer chave de reidentificação, mantendo só contagens.
- **REQ-BI-005** (origem: CONST VII): Cada métrica DEVE ter definição versionada (o que conta, o que não conta, origem, data da versão), visível no painel.

**Painéis da Gestão (`bi.koovela.com`)**

- **REQ-BI-010** (origem: DF 9.6 "Painel operacional" | DF 14 | CONST 7): O painel operacional DEVE mostrar por mês: North Star; tenants ativados; % de tenants com primeiro agendamento em 7 dias; taxa de instalação do app; parcela de agendamentos pela web e instalação posterior do app; ocupação; agendamentos por tenant ativo; no-show com e sem lembrete; avaliação média; incidentes de reserva dupla; MTTR; custo de infraestrutura por tenant; falhas de migração por release.
- **REQ-BI-011** (origem: DF 9.6 "Painel financeiro" | DF 14): O painel financeiro DEVE mostrar por mês: GMV (pela plataforma e no local), receita da Koovela por fonte, take rate efetivo, ARPA, NRR, inadimplência e recuperação, chargebacks e perda por fraude / GMV, margem por tenant e CAC por canal.
- **REQ-BI-012** (origem: DF 9.6 "Painel de coorte e retenção" | DF 14): O painel de coorte DEVE mostrar retenção e NRR de tenants por mês de ativação, e recompra de consumidores em 30, 60 e 90 dias por mês do primeiro agendamento, no estabelecimento e na plataforma.
- **REQ-BI-013** (origem: DF 14): Os painéis DEVEM ter filtros por período, vertical, categoria, cidade, plano, canal de aquisição e coorte de ativação.
- **REQ-BI-014** (origem: CONST IV | D39): Células com menos de 5 tenants ou consumidores NÃO DEVEM mostrar valor.
- **REQ-BI-015** (origem: DF 14 "CAC por canal" | "custo de infra por tenant"): O Comercial/Growth DEVE informar no BI o gasto mensal por canal de aquisição, e o SRE o custo mensal de infraestrutura e de envios, para o cálculo de CAC e de custo e margem por tenant.
- **REQ-BI-016** (origem: CONST III): Totais financeiros de mês fechado DEVEM bater ao centavo com a conciliação (spec 012) e as faturas (spec 019); estornos posteriores aparecem no mês em que aconteceram.
- **REQ-BI-017** (origem: CONST 3 | REQ-FND-034): `bi.koovela.com` DEVE exigir autenticação de borda com MFA; dentro dele, cada perfil da Gestão vê os painéis permitidos pela matriz (spec 003).

**Dashboards do estabelecimento**

- **REQ-BI-020** (origem: DF 9.3 "Dashboard da filial"): O Dashboard da filial DEVE mostrar agendamentos de hoje e da semana, ocupação por colaborador, receita do período, não comparecimentos e cancelamentos tardios, novos consumidores, recompra em 30, 60 e 90 dias, avaliação média, serviços e profissionais mais agendados e origem dos agendamentos.
- **REQ-BI-021** (origem: DF 9.3 "Dashboard consolidado da rede"): O Dashboard consolidado DEVE mostrar os mesmos indicadores por filial e no total, só para o Proprietário.
- **REQ-BI-022** (origem: DF 7 | PEN-03): O Gerente DEVE ver só a própria filial; vê a receita só da própria filial; Recepção e Colaborador não veem os dashboards (o Colaborador vê a própria ocupação e comissão no app, specs 007 e 018).
- **REQ-BI-023** (origem: CONST II): Os dashboards DEVEM mostrar só dados do próprio tenant.
- **REQ-BI-024** (origem: edge case): Para autônomos (uma filial e um colaborador), os dashboards DEVEM esconder comparações sem sentido.

**Qualidade dos dados**

- **REQ-BI-030** (origem: CONST X): Todo painel DEVE mostrar a hora da última atualização; atraso acima de 2 horas (Gestão) ou 30 minutos (estabelecimento) DEVE gerar aviso no painel e alerta ao SRE.
- **REQ-BI-031** (origem: CONST X): Uma verificação diária DEVE comparar os totais do BI com as fontes; divergência acima de 0,5%, ou qualquer divergência financeira de mês fechado, DEVE gerar alerta.
- **REQ-BI-032** (origem: CONST 6): Com o volume inicial da CONST 6, os painéis da Gestão DEVEM responder em até 5 segundos e os dashboards em até 3 segundos (p95); com 10× o volume, em até 15 e 5 segundos.

**Evolução**

- **REQ-BI-040** (origem: DF 14 "Fase 2" | D39): O modelo DEVE aceitar as métricas da fase 2 (ocupação de turmas, conversão de plano, uso de vale-presente e pacotes, campanhas, conversão da vitrine) e o benchmark da fase 3 sem refazer as métricas existentes; nenhuma métrica aparece antes de a função existir.

### Key Entities

- **Métrica** (versionada): nome, definição, origem, camada (DF 14), versão, data.
- **Fato analítico**: tipo de evento, tenant, negócio, filial, data local, valores, pseudônimos.
- **Insumo manual**: tipo (gasto por canal, custo de infraestrutura, custo de envios), mês, valor, autor.
- **Verificação de qualidade**: data, métrica, valor no BI, valor na origem, diferença, resultado.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| BI (DF 9.6) | Painel operacional · Painel financeiro · Painel de coorte e retenção | Registrados no plano |
| Painel do cliente (DF 9.3) | Dashboard da filial · Dashboard consolidado da rede | Registrados no plano |

A tela de insumos manuais (gasto por canal, custos) não aparece no protótipo; é uma tela nova do BI.

---

## Regras e estados

- **North Star**: atendimentos `CONCLUIDO` com pagamento aprovado ou registrado no local cobrindo o valor final (REQ-PAG "Atendimento pago"), contados no mês da conclusão, na data local da filial.
- **Tenant ativado** (métrica de BI): tenant com o primeiro atendimento concluído e pago. O critério para pagar parceiros é outro (spec 038, `[PEN-30]` decidido: primeira assinatura paga).
- **Tenant ativo** num mês: assinatura `ativa` ou `em_degustação` e pelo menos um agendamento concluído no mês.
- **Taxa de instalação do app**: consumidores com pelo menos um agendamento no mês que têm o app instalado e com sessão ativa ÷ consumidores com agendamento no mês.
- **Ocupação**: tempo ocupado por agendamentos concluídos ÷ tempo de trabalho disponível (spec 007), por colaborador e filial.
- **Recompra em N dias**: consumidores com novo agendamento concluído em até N dias após um atendimento ÷ consumidores atendidos no período.
- **Mês fechado**: mês anterior após a conciliação do último dia (spec 012).
- **Supressão**: célula com menos de 5 entidades não é mostrada.

---

## Dados pessoais

| Item | Definição |
|---|---|
| **Campos guardados** | Só pseudônimos de consumidores e colaboradores, identificadores de tenant, negócio e filial, datas e valores |
| **Proibidos na cópia analítica** | Nome, celular, e-mail, CPF, endereço, anotações, alertas, comentários de avaliação, observações |
| **Eliminação** | Titulares que pedem eliminação têm o pseudônimo desligado de qualquer chave de reidentificação (REQ-BI-004) |
| **Supressão de células pequenas** | Menos de 5 entidades, sem valor exibido |
| **Base legal** | Legítimo interesse para métricas de operação do serviço (LGPD art. 7, IX), com dados pseudonimizados |
| **Retenção** | 5 anos para fatos financeiros; 3 anos para os demais fatos — categorias `bi_financial_facts` e `bi_other_facts` da tabela de retenção da spec 022, aplicadas pelo `applyRetention` do BI |
| **Ids de referência** | A cópia analítica não guarda ids que levem a uma pessoa (agendamento, pagamento, consumidor); a deduplicação usa só o `event_id`; quando uma referência é indispensável, só hash com sal do BI, descartado na eliminação |
| **Quem acessa** | Gestão conforme o perfil; Proprietário e Gerente, só dados do próprio tenant nos dashboards |

---

## Permissões

| Ação | Gerente | Proprietário | Fin/Ops | Comercial/Growth | SRE |
|---|---|---|---|---|---|
| Dashboard da filial | ✔ filial, com receita só da própria filial (`[PEN-03]`; o Proprietário pode retirar) | ✔ | — | — | — |
| Dashboard consolidado da rede | — | ✔ | — | — | — |
| Painel operacional | — | — | ✔ | ✔ | ✔ |
| Painel financeiro | — | — | ✔ | ✔ (sem margem por tenant) | — |
| Painel de coorte | — | — | ✔ | ✔ | ✔ |
| Informar gasto por canal | — | — | — | ✔ | — |
| Informar custos de infraestrutura e envios | — | — | ✔ | — | ✔ |

O Suporte não abre os painéis da Gestão (`bi.koovela.com`); em sessão de suporte (spec 003), vê os dashboards P01/P02 do tenant atendido, pelo painel do tenant.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `platform.bi_metric_definition.published.v1` | Nova versão de definição de métrica (evento operacional, spec 001) |
| `platform.bi_data_quality.check_failed.v1` | Divergência ou atraso detectado (evento operacional, spec 001) |

Esta spec consome os eventos de todas as specs da v1.0 e não publica eventos de domínio de negócio.

### Métricas desta spec

| Métrica | Origem | Meta |
|---|---|---|
| Atraso da cópia analítica | REQ-BI-002 | Até 1 hora (Gestão); até 15 minutos (estabelecimento) |
| Divergências na verificação diária | REQ-BI-031 | 0 financeiras de mês fechado |
| Tempo de resposta dos painéis (p95) | REQ-BI-032 | Até 5 s (Gestão); até 3 s (dashboards) |
| Uso dos dashboards pelos estabelecimentos (acessos por semana) | DF 9.3 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A North Star e as quatro métricas da CONST 7 aparecem no painel operacional a partir do primeiro tenant.
- **SC-002**: Os totais financeiros de mês fechado batem ao centavo com a conciliação e as faturas em 100% dos meses.
- **SC-003**: Nenhum dado pessoal identificável está na cópia analítica, verificado por varredura automática.
- **SC-004**: O Proprietário vê os números da filial ou da rede em até 3 segundos ao abrir o painel.
- **SC-005**: Todo atraso de dados acima do limite gera aviso no painel e alerta em até 15 minutos.
- **SC-006**: Cada métrica exibida tem definição consultável em um toque.
- **SC-007**: Nenhuma célula com menos de 5 entidades mostra valor.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-03** — Gerente vê receita | Spec 003 | Decidido: só da própria filial |
| **PEN-30** — critério de "tenant ativado" | Fase 3 (spec 038) | Até lá, "ativado" = primeiro atendimento concluído e pago |
| **PEN-09** — taxa no split ou na fatura | Spec 012 | Decidido: split + fatura |
| **PEN-20** — topologia (réplica) | Spec 001 (D44 proposta) | Sem réplica na v1.0: cópia analítica alimentada por eventos, nos hosts declarados |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Dashboards do estabelecimento | ASSUMIDO: pertencem a esta spec, porque nenhuma outra cobre as telas "Dashboard da filial" e "Dashboard consolidado da rede" (DF 9.3) |
| Atrasos | ASSUMIDO: 1 hora (Gestão) e 15 minutos (estabelecimento) |
| Supressão | ASSUMIDO: células com menos de 5 entidades |
| Insumos manuais | ASSUMIDO: gasto por canal e custos informados mensalmente no BI |
| Custo | ASSUMIDO: ferramentas gratuitas ou auto-hospedadas (REQ-FND-048) |

---

## Fora do escopo desta especificação

- Benchmark anonimizado para tenants (spec 037, `[D39]`).
- Métricas da fase 2 e 3, que entram nas specs donas usando este modelo.
- Exportação de dados brutos do BI e consultas livres por usuários.
- Painéis de observabilidade técnica em tempo real (spec 001).
- Venda de dados ou relatórios a terceiros (proibido, `[D39]`).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: atrasos de 1 hora e 15 minutos; aviso de atraso de 2 horas e 30 minutos; divergência tolerada de 0,5% (zero em financeiro fechado); tempo de resposta de 5 e 3 segundos (15 e 5 com 10× o volume); supressão abaixo de 5; retenção de 5 anos (financeiro) e 3 anos (demais).
- O BI é feito em Python (`[D25]`, CONST 4.1) e servido em `bi.koovela.com`; os dashboards do estabelecimento ficam no painel, lendo a mesma cópia analítica por contrato.
- Com dois hosts e sem réplica (spec 001), a cópia analítica roda no host de dados (`db-worker-01`), isolada do transacional.
- O dono desta spec é o componente `bi/` da estrutura do repositório (CONST 4.2), fora dos serviços de domínio. O domínio `insights` (CONST 4.4) só passa a existir na fase 3, para o benchmark, e nenhum código dele é escrito antes; os dashboards do estabelecimento são servidos pelo painel lendo a cópia analítica por contrato.
