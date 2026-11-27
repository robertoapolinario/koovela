# Feature Specification: Catálogo de serviços, combos e pacotes

**Feature Branch**: `006-catalogo`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "006 catalogo — seguir a sequência da constituição (seção 10): serviços, preços, combos (mesmo profissional), pacotes de sessões. Depende de 005. Pendência PEN-07. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para as fases 2 e 3)

**Superfícies afetadas**: painel do cliente (Serviços e preços, Combos, Pacotes de sessões; passo "Serviços e preços" do onboarding) · web do consumidor e app do consumidor (lista de serviços na página do estabelecimento e "Detalhe do serviço ou procedimento") · app do colaborador e `/pro` (leitura dos serviços que executa)

**Depende de**: 005 `negocio-filiais-onboarding`

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, III, VI, VII, XI, seções 2, 4.4, 5, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.1.10, 4.1, 4.3, 6, 6.1, 7, 8 (J1, J3, J4), 9.1, 9.2, 9.3, 9.8 e 18. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O consumidor só agenda o que consegue entender: o que é o serviço, quanto tempo leva e quanto custa (DF 3.1.10, "previsibilidade de preço"). O estabelecimento, por sua vez, precisa cadastrar o catálogo rápido no onboarding (J3) e manter o mesmo padrão em todas as filiais (J4), com preço próprio por filial quando for o caso.

Três formas de venda fazem parte da v1.0 (DF 4.3):

- **serviço avulso**: slot fixo 1:1 com profissional;
- **combo sequencial com o mesmo profissional** `[D19]`: por exemplo, corte + barba, ou limpeza + clareamento;
- **pacote de N sessões com saldo** `[PEN-07]`: exigido por saúde (fisioterapia, psicologia, nutrição), em que o tratamento é recorrente.

O catálogo também precisa nascer preparado para o que vem depois, sem migração destrutiva (CONST 2): duração por atributo do atendido (pet, `[D29]`), local do serviço no endereço do cliente (`[D40]`), orçamento opcional (`[D40]`) e combo com troca de profissional (`[D34]`).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.10 | Previsibilidade de preço | % de serviços com preço publicado |
| 3.2.1 | Aumentar receita | Receita por filial/mês (combos e pacotes) |
| 3.2.11 | Operar várias filiais com padrão | Tempo para abrir filial |
| 3.1.11 | Manter tratamento com sessões recorrentes | Aderência à série (pacotes) |

Personas: Proprietário; Gerente de filial; prestador autônomo; consumidor que consulta o catálogo; Colaborador que consulta os serviços que executa.

---

## Clarifications

### Session 2026-11-25

- Q: Como fica o preço dos serviços em saúde? → A: Saúde (PEN-06, decidido na spec 005): o preço nunca aparece em nenhum lugar; taxa de agendamento fixa abatida do valor do atendimento; fica restrito só o que mostra preço.
- Q: O pacote de N sessões entra na v1.0? (PEN-07) → A: Sim, em venda simples: o estabelecimento vende o pacote com saldo e validade e o consumidor usa nos agendamentos. Venda para terceiros e regras de reembolso continuam na fase 2 (`[D33]`, spec 029). Em saúde, o pacote não mostra preço.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar serviços com duração e preço (Priority: P1)

Como Proprietário ou autônomo, quero cadastrar meus serviços com nome, descrição, duração, preço e grupo, partindo de sugestões da minha vertical, para publicar o catálogo em poucos minutos.

**Why this priority**: sem serviço não há agendamento; é o passo "Serviços e preços" do onboarding (DF 9.2) e o maior tempo do J3.

**Independent Test**: criar um negócio de barbearia, aceitar 3 sugestões de serviço, ajustar preço e duração, criar 1 serviço do zero, e ver os 4 na página pública.

**Acceptance Scenarios**:

1. **Given** um negócio com vertical definida, **When** o Proprietário abre "Serviços e preços" pela primeira vez, **Then** vê uma lista de serviços sugeridos para a categoria (nome, descrição curta e duração típica, sem preço), que pode aceitar, editar ou ignorar.
2. **Given** um serviço novo, **When** o Proprietário informa nome, duração e preço, **Then** o serviço é salvo com preço em reais (com centavos), duração em múltiplos de 5 minutos entre 5 e 720, e fica disponível em todas as filiais do negócio por padrão.
3. **Given** um serviço, **When** o Proprietário define tempo de preparo antes e de limpeza depois, **Then** esses tempos bloqueiam a agenda do profissional mas não aparecem como duração para o consumidor.
4. **Given** serviços, **When** o Proprietário os organiza em grupos (por exemplo, "Cabelo", "Unhas") e define a ordem, **Then** a página pública mostra os grupos e os serviços nessa ordem.
5. **Given** um serviço, **When** o Proprietário escolhe o tipo de preço "a partir de", **Then** a página mostra "a partir de R$ X", o valor de referência para sinal e pagamento antecipado é o valor mínimo, e o valor final é registrado no fechamento do atendimento (spec 009).
6. **Given** um serviço marcado como "só agendamento interno", **When** a página pública é exibida, **Then** ele não aparece para o consumidor, mas a Recepção pode usá-lo no agendamento manual.
7. **Given** um negócio de saúde, **When** a página pública exibe os serviços, **Then** nenhum preço aparece (REQ-NEG-052): a página mostra "valor informado no atendimento" e a taxa de agendamento fixa; o preço continua cadastrado só para cobrança no local, comissão e nota fiscal.

---

### User Story 2 - Preço e disponibilidade por filial (Priority: P1)

Como Proprietário de rede, quero que um serviço tenha preço padrão do negócio e, quando necessário, preço diferente em uma filial, e escolher em quais filiais ele é oferecido.

**Why this priority**: redes têm preço por região (DF 3.2.11); a clonagem de filial (spec 005) depende dessa disponibilidade.

**Independent Test**: com 2 filiais, definir preço padrão de um serviço, sobrescrever o preço na filial B, desativá-lo na filial C clonada, e conferir as três páginas.

**Acceptance Scenarios**:

1. **Given** um serviço com preço padrão, **When** o Proprietário define um preço próprio na filial B, **Then** a filial B usa esse preço e as demais, o padrão.
2. **Given** um serviço, **When** o Proprietário o desativa numa filial, **Then** ele some da página daquela filial e não pode ser agendado nela; agendamentos já feitos continuam.
3. **Given** uma filial clonada (spec 005), **When** a clonagem roda, **Then** a nova filial recebe a mesma disponibilidade e os mesmos preços próprios da filial de origem.
4. **Given** um Gerente da filial X, **When** cria um serviço, **Then** ele nasce disponível só na filial X; o Gerente pode definir o preço próprio e a disponibilidade dos serviços na filial X, mas não altera o preço padrão nem serviços de outras filiais.

---

### User Story 3 - Preço versionado e congelado no agendamento (Priority: P1)

Como consumidor, quero pagar o preço que vi quando agendei; como estabelecimento, quero mudar preços sem afetar o que já está marcado e ver o histórico das mudanças.

**Why this priority**: CONST III exige que a regra vigente, inclusive o preço, seja versionada e congelada no agendamento.

**Independent Test**: agendar um serviço (com a spec 009 ou um teste de contrato), mudar o preço e verificar que o agendamento existente mantém o preço antigo e um novo agendamento usa o novo.

**Acceptance Scenarios**:

1. **Given** uma mudança de preço ou de duração, **When** salva, **Then** cria uma nova versão do serviço com data de vigência (imediata ou futura), mantendo as versões anteriores.
2. **Given** uma nova versão com vigência futura, **When** a data chega, **Then** passa a valer para novos agendamentos naquela data em diante, sem ação manual.
3. **Given** um agendamento criado, **When** consultado, **Then** referencia a versão do serviço vigente no momento da criação; o catálogo DEVE fornecer essa versão por contrato a qualquer tempo.
4. **Given** o histórico de um serviço, **When** o Proprietário o abre, **Then** vê cada versão com preço, duração, autor e data.
5. **Given** uma mudança de preço, **When** salva, **Then** gera registro na trilha de auditoria (spec 004, categoria administrativa de tenant).

---

### User Story 4 - Combo com o mesmo profissional (Priority: P2)

Como estabelecimento, quero vender combos (por exemplo, "corte + barba") em que o mesmo profissional faz os serviços em sequência, com preço do combo, para aumentar o tíquete (`[D19]`).

**Why this priority**: combo está na v1.0 e na fatia zero (DF 15); é o principal gerador de tíquete médio em beleza.

**Independent Test**: criar o combo "corte + barba" com desconto, ver na página pública a duração total e a economia, e verificar pelo contrato que ele é entregue como lista ordenada de etapas para o motor de agenda.

**Acceptance Scenarios**:

1. **Given** dois a cinco serviços ativos do mesmo negócio, **When** o Proprietário cria um combo, **Then** define a ordem das etapas, o preço do combo (igual ou menor que a soma) e, opcionalmente, um intervalo entre etapas de 0 a 15 minutos.
2. **Given** um combo, **When** exibido ao consumidor, **Then** mostra as etapas, a duração total (soma das durações e intervalos), o preço do combo e quanto ele economiza em relação aos serviços avulsos.
3. **Given** um combo, **When** o motor de agenda (spec 008) o consulta, **Then** recebe a lista ordenada de etapas com duração, tempos de preparo e limpeza e a regra "mesmo profissional em todas as etapas"; a reserva atômica é da spec 008/009 (CONST I).
4. **Given** um serviço que faz parte de um combo, **When** é desativado, **Then** o combo é desativado junto e o Proprietário é avisado.
5. **Given** a mudança de preço de um serviço avulso, **When** salva, **Then** o preço do combo não muda sozinho; se a soma dos avulsos ficar menor que o preço do combo, o Proprietário é avisado e o combo deixa de mostrar "economia".
6. **Given** um combo, **When** disponível numa filial, **Then** é porque todas as suas etapas estão disponíveis naquela filial.

---

### User Story 5 - Pacote de sessões (Priority: P2)

Como estabelecimento de saúde ou estética, quero vender pacotes de N sessões de um serviço, com preço e validade, para dar previsibilidade ao tratamento do paciente (DF 4.3).

**Why this priority**: saúde praticamente exige pacotes (`[PEN-07]`); sem eles, o cluster B fica restrito a consulta avulsa.

**Independent Test**: criar um pacote de 10 sessões de fisioterapia com validade de 90 dias, vê-lo na página pública, e verificar pelo contrato que ele informa à spec 012 o que vender e à spec 009 o que consumir.

**Acceptance Scenarios**:

1. **Given** a inclusão de pacotes na v1.0, **When** o Proprietário cria um pacote, **Then** define serviço, quantidade de sessões, preço e validade; o pacote entra na v1.0 em venda simples (`[PEN-07]` resolvido); venda para terceiros e reembolso ficam na fase 2.
2. **Given** um pacote, **When** criado, **Then** tem: serviço (ou combo) incluído, número de sessões (2 a 50), preço total, validade em dias a partir da compra (30 a 730), abrangência (só a filial da compra ou todas as filiais do negócio) e regra de devolução.
3. **Given** um pacote, **When** exibido ao consumidor, **Then** mostra número de sessões, preço total, preço por sessão, economia em relação ao avulso e validade.
4. **Given** a compra de um pacote (spec 012), **When** confirmada, **Then** o saldo de sessões é criado como lançamento no livro-razão (CONST III), sem nunca ficar negativo (DF 6.1, invariante 4).
5. **Given** um consumidor com saldo, **When** agenda o serviço do pacote (spec 009), **Then** uma sessão é reservada no saldo; ao concluir o atendimento, ela é consumida; ao cancelar dentro da política, ela volta; no não comparecimento, segue a política da spec 010.
6. **Given** uma mudança no pacote (preço, sessões, validade), **When** salva, **Then** vale só para novas compras; pacotes já comprados mantêm as condições da compra (versão congelada).
7. **Given** sessões a 7 dias de vencer, **When** o prazo chega, **Then** o consumidor é avisado (spec 011).

---

### User Story 6 - Consumidor entende o serviço antes de agendar (Priority: P3)

Como consumidor, quero ver o detalhe do serviço (o que inclui, duração, preço, fotos, quem faz) antes de escolher o profissional e o horário.

**Why this priority**: é a tela "Detalhe do serviço ou procedimento" da J1 (DF 9.1, 9.8); a escolha de profissional e horário é das specs 008 e 009.

**Independent Test**: abrir a página de um estabelecimento no app e na web, tocar num serviço, num combo e num pacote, e conferir o detalhe de cada um.

**Acceptance Scenarios**:

1. **Given** a página do estabelecimento, **When** o consumidor toca num serviço, **Then** vê nome, descrição, duração, preço (ou o texto da regra de saúde), fotos (até 5) e as filiais onde é oferecido.
2. **Given** um combo ou pacote, **When** o consumidor o abre, **Then** vê as etapas ou sessões, a duração, o preço e a economia.
3. **Given** um serviço indisponível na filial escolhida, **When** o consumidor navega, **Then** ele não aparece naquela filial.
4. **Given** a lista de serviços, **When** carregada em rede 3G, **Then** aparece com os textos antes das fotos, sem bloquear a rolagem.

---

### Edge Cases

- **Desativar serviço com agendamentos futuros**: permitido; impede novos agendamentos, e os existentes continuam com a versão congelada.
- **Apagar serviço**: só se nunca foi agendado, vendido em pacote nem usado em combo; caso contrário, só arquivar.
- **Preço zero** (por exemplo, avaliação gratuita): permitido; o serviço aparece como "gratuito" e não gera cobrança.
- **Duas mudanças de preço com a mesma vigência**: a segunda substitui a primeira antes da vigência, com histórico.
- **Mudança de duração com agendamentos futuros**: não altera os agendamentos existentes; vale para os novos.
- **Combo com serviço só de agendamento interno**: o combo também fica só interno.
- **Pacote de um serviço desativado**: o saldo de quem já comprou continua válido; a Recepção ainda pode agendar as sessões restantes; o pacote sai da venda.
- **Pacote com abrangência "todas as filiais" e filial encerrada** (spec 005): o saldo continua utilizável nas demais filiais.
- **Arredondamento do preço por sessão** exibido: arredondado para baixo ao centavo, só para exibição; o valor cobrado é o preço total do pacote.
- **Importar catálogo de outro negócio do mesmo Cliente**: permitido, como cópia independente.
- **Nome de serviço duplicado no mesmo negócio**: avisado, mas permitido (por exemplo, mesmo nome com durações diferentes).

---

## Requirements *(mandatory)*

Formato: `REQ-CAT-NNN (origem: …)`.

### Functional Requirements

**Serviço**

- **REQ-CAT-001** (origem: DF 6 `Servico` | J3): O serviço DEVE pertencer a um negócio e ter nome, descrição, grupo, ordem, duração, tempo de preparo, tempo de limpeza, tipo de preço (fixo ou "a partir de"), preço padrão, visibilidade (público ou só interno), fotos (até 5) e estado (ativo, inativo, arquivado).
- **REQ-CAT-002** (origem: CONST III): O preço DEVE ser guardado em centavos inteiros com o código de moeda `BRL`; valores com fração de centavo DEVEM ser recusados.
- **REQ-CAT-003** (origem: DF 4.3): A duração DEVE ser múltipla de 5 minutos, entre 5 e 720; preparo e limpeza, múltiplos de 5 minutos entre 0 e 120 (ajuste de 2026-11-26, para casar com as células de 5 minutos do motor de agenda, spec 008).
- **REQ-CAT-004** (origem: DF 4 | J3): DEVE existir, por categoria de vertical, uma lista de serviços sugeridos (nome, descrição curta e duração típica, sem preço), mantida pela Gestão.
- **REQ-CAT-005** (origem: DF 3.1.10): No preço "a partir de", o valor mínimo DEVE ser a referência para sinal e pagamento antecipado; o valor final, registrado no fechamento (spec 009), NÃO DEVE ser menor que o mínimo, e o consumidor DEVE ser informado antes de pagar a diferença.
- **REQ-CAT-006** (origem: PEN-06 | REQ-NEG-052): Nas verticais de saúde, o preço NÃO DEVE ser exibido em nenhuma superfície (REQ-NEG-052); continua cadastrado para cobrança no local, comissão e nota fiscal.
- **REQ-CAT-007** (origem: CONST 2 | D40 | D29 | D28): O serviço DEVE ter, desde a v1.0, os campos `service_location_mode` (na v1.0, só "no estabelecimento"), indicação de orçamento opcional (na v1.0, sempre "não"), regra de duração por atributo (na v1.0, vazia) e tipo de atendido aceito (na v1.0, só "o próprio consumidor"), sem interface nesta spec.
- **REQ-CAT-008** (origem: edge case): Serviço já agendado, vendido em pacote ou usado em combo NÃO DEVE ser apagado, só arquivado.

**Preço e disponibilidade por filial**

- **REQ-CAT-010** (origem: D05 | DF 3.2.11): Cada serviço DEVE ter disponibilidade por filial (padrão: todas) e preço próprio opcional por filial.
- **REQ-CAT-011** (origem: REQ-NEG-021): O catálogo DEVE oferecer o contrato de clonagem usado pela spec 005, copiando disponibilidade e preços próprios de uma filial para outra.
- **REQ-CAT-012** (origem: DF 7 | DF 2.2): O Proprietário DEVE gerir todo o catálogo. O Gerente DEVE poder criar serviços disponíveis só na própria filial e definir preço próprio e disponibilidade na própria filial, sem alterar preço padrão nem outras filiais.

**Versionamento**

- **REQ-CAT-020** (origem: CONST III): Toda mudança de preço, duração, preparo, limpeza ou composição (combo e pacote) DEVE criar nova versão, com vigência imediata ou futura, preservando as anteriores.
- **REQ-CAT-021** (origem: CONST III | CONST VII): O catálogo DEVE fornecer por contrato a versão vigente numa data e qualquer versão pelo identificador, para que o agendamento (spec 009) a congele.
- **REQ-CAT-022** (origem: CONST V | REQ-AUD-001): Mudanças de preço e de composição DEVEM gerar registro na trilha de auditoria.

**Combo**

- **REQ-CAT-030** (origem: D19 | DF 6 `Combo`): O combo DEVE ter de 2 a 5 etapas ordenadas, cada uma um serviço ativo do mesmo negócio, com a regra "mesmo profissional em todas as etapas", intervalo entre etapas de 0 a 15 minutos e preço próprio igual ou menor que a soma dos avulsos.
- **REQ-CAT-031** (origem: D19): A duração exibida do combo DEVE ser a soma das durações e dos intervalos; preparo vale só antes da primeira etapa, e limpeza, só depois da última.
- **REQ-CAT-032** (origem: CONST I | CONST VII): O combo DEVE ser entregue ao motor de agenda (spec 008) como lista ordenada de etapas com durações e a regra de profissional; a reserva atômica não é deste domínio.
- **REQ-CAT-033** (origem: D19): Um combo só DEVE estar disponível numa filial se todas as etapas estiverem; desativar uma etapa desativa o combo, com aviso.
- **REQ-CAT-034** (origem: D17 | CONST III): O combo DEVE informar, por etapa, o valor proporcional do desconto, para que a comissão (spec 007) aplique a regra de absorção do tenant (`[D17]`). O rateio é proporcional ao preço avulso de cada etapa, com o resto do arredondamento na última etapa.
- **REQ-CAT-035** (origem: CONST 2 | D34): O modelo do combo DEVE aceitar, sem migração destrutiva, a variante com troca de profissional da fase 2 (profissionais possíveis por etapa).

**Pacote de sessões**

- **REQ-CAT-040** (origem: PEN-07 | DF 4.3 | DF 6): O pacote de N sessões DEVE entrar na v1.0 em venda simples (saldo e validade); os REQ-CAT-041 a 046 valem na v1.0; venda para terceiros e reembolso ficam na fase 2 (spec 029). Nas verticais de saúde (PEN-06, preço nunca exibido), o pacote é cadastrado no painel e vendido só no local pela Recepção; o consumidor vê no app e na web apenas o saldo e a validade do que já comprou (research R8).
- **REQ-CAT-041** (origem: DF 6 `Pacote de sessões`): O pacote DEVE ter serviço ou combo incluído, número de sessões (2 a 50), preço total, validade em dias a partir da compra (30 a 730), abrangência (filial da compra ou todas as filiais do negócio) e regra de devolução.
- **REQ-CAT-042** (origem: CONST III | DF 6.1 inv. 4): O saldo de sessões DEVE ser um livro-razão (compra, reserva, consumo, devolução, expiração, estorno) mantido pelo domínio de pagamentos (spec 012, CONST 4.4); o saldo NUNCA DEVE ficar negativo.
- **REQ-CAT-043** (origem: CONST III): A compra DEVE congelar a versão do pacote; mudanças posteriores valem só para novas compras.
- **REQ-CAT-044** (origem: CDC art. 49 | CONST III): A regra de devolução DEVE garantir, no mínimo, devolução integral em até 7 dias da compra feita pela internet quando nenhuma sessão foi usada; depois disso, vale a regra configurada pelo tenant, exibida antes da compra.
- **REQ-CAT-045** (origem: DF 6.1 inv. 4): Cada agendamento de serviço coberto por pacote DEVE reservar uma sessão; concluir consome, cancelar dentro da política devolve, e o não comparecimento segue a spec 010.
- **REQ-CAT-046** (origem: DF 3.1.11): O consumidor DEVE ser avisado 7 dias antes do vencimento das sessões (spec 011); sessões vencidas não podem ser agendadas.

**Exibição ao consumidor**

- **REQ-CAT-050** (origem: DF 9.1 | DF 9.8): A página do estabelecimento DEVE listar grupos, serviços, combos e pacotes públicos disponíveis na filial, com nome, duração, preço (ou texto da regra de saúde) e, para combos e pacotes, a economia.
- **REQ-CAT-051** (origem: DF 9.1 "Detalhe do serviço"): O detalhe DEVE mostrar descrição, duração, preço, fotos e filiais onde é oferecido; para combos, as etapas; para pacotes, sessões, validade e regra de devolução.
- **REQ-CAT-052** (origem: CONST XI | CONST 6): A lista e o detalhe DEVEM funcionar em 3G, carregando texto antes das fotos, e cumprir WCAG 2.1 AA.
- **REQ-CAT-053** (origem: CONST 3 `cdn.koovela.com`): Fotos de serviço DEVEM seguir as regras de envio e de remoção de metadados da spec 005.

**Contratos e eventos**

- **REQ-CAT-060** (origem: CONST VII): O catálogo DEVE publicar contratos de consulta (serviços, combos e pacotes por filial, versão vigente numa data, versão por identificador) e eventos de mudança, consumidos pelas specs 007, 008, 009, 012 e 017.
- **REQ-CAT-061** (origem: CONST II): Todo o catálogo fica no espaço de dados do tenant; a página pública o lê pelo tenant resolvido a partir do slug (REQ-IDN-040).

### Key Entities

- **Grupo de serviços**: negócio, nome, ordem.
- **Serviço** (`service`): negócio, grupo, nome, descrição, fotos, visibilidade, estado, campos latentes das fases 2 e 3.
- **Versão de serviço**: serviço, número, duração, preparo, limpeza, tipo de preço, preço padrão, vigência, autor.
- **Disponibilidade por filial**: serviço, filial, disponível (sim ou não), preço próprio opcional (versionado).
- **Combo** (`combo`): negócio, nome, preço, intervalo entre etapas, regra de profissional, estado; versões.
- **Etapa de combo**: combo, ordem, serviço, rateio do desconto.
- **Pacote de sessões** (`session_package`): negócio, serviço ou combo, sessões, preço total, validade, abrangência, regra de devolução, estado; versões.
- **Sugestão de serviço por vertical** (global): categoria, nome, descrição, duração típica.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (DF 9.3) | Serviços e preços · Combos · Pacotes de sessões | Códigos do Figma registrados no plano |
| Painel (onboarding, DF 9.2) | Serviços e preços | Código do Figma registrado no plano |
| App do consumidor (DF 9.1) | Página do estabelecimento (lista de serviços) · Detalhe do serviço ou procedimento | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Página do estabelecimento (lista) · Detalhe do serviço (janela) | `W..` registrados no plano |
| Back-office | Sugestões de serviço por vertical (manutenção mínima) | Registrado no plano |

---

## Regras e estados

- **Serviço, combo e pacote**: `ativo` ↔ `inativo` → `arquivado`. Só `ativo` e público aparece ao consumidor. Apagar é possível só se nunca foi usado.
- **Versão**: `agendada` (vigência futura) → `vigente` → `substituída`. Uma versão vigente ou substituída nunca muda.
- **Preço efetivo** de um serviço numa filial e numa data: preço próprio da filial vigente, senão preço padrão vigente.
- **Combo disponível** numa filial: todas as etapas ativas e disponíveis nela.
- **Saldo de pacote** (spec 012): compra → reserva (agendamento) → consumo (conclusão) ou devolução (cancelamento dentro da política); expiração ao fim da validade.

---

## Dados pessoais

Esta spec **não coleta dado pessoal**: serviços, combos e pacotes são dados do negócio.

| Item | Definição |
|---|---|
| **Campos de pessoa** | Apenas o identificador do autor de cada versão (membro da equipe) |
| **Fotos de serviço** | Podem mostrar pessoas (antes e depois); o envio exige que o Proprietário declare ter autorização de uso de imagem; metadados de localização removidos |
| **Saldo de pacote** | Pertence ao consumidor, mas é guardado pela spec 012, com as regras de dados pessoais dela |
| **Base legal** | Execução de contrato com o tenant (LGPD art. 7, V) |
| **Quem acessa** | Público (serviços públicos), equipe do tenant conforme papel |

---

## Permissões

Recorte da matriz RBAC (DF 7, "Cadastrar serviço e preço"):

| Ação | Colaborador | Recepção | Gerente | Proprietário | Suporte |
|---|---|---|---|---|---|
| Ver catálogo completo (inclui só interno) | ✔ leitura | ✔ leitura | ✔ | ✔ | ✔* |
| Criar e editar serviço, preço padrão, combo, pacote | — | — | ✔ só da própria filial (REQ-CAT-012) | ✔ | — |
| Preço próprio e disponibilidade por filial | — | — | ✔ filial | ✔ | — |
| Arquivar e apagar | — | — | ✔ só da própria filial | ✔ | — |
| Manter sugestões por vertical (back-office) | — | — | — | — | SRE ou Comercial/Growth |

`✔*` = apenas em sessão de suporte (spec 003), registrada e com expiração.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `catalog.service.created.v1` / `.updated.v1` / `.deactivated.v1` / `.archived.v1` | Ciclo do serviço |
| `catalog.service.version_published.v1` | Nova versão (preço, duração) criada, com vigência |
| `catalog.service.branch_availability_changed.v1` | Disponibilidade ou preço próprio por filial alterado |
| `catalog.combo.created.v1` / `.updated.v1` / `.deactivated.v1` | Ciclo do combo |
| `catalog.session_package.created.v1` / `.updated.v1` / `.deactivated.v1` | Ciclo do pacote |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| % de serviços públicos com preço publicado | DF 3.1.10 | Acompanhada (fora de saúde: acima de 90%) |
| Tempo do passo "Serviços e preços" no onboarding | DF 3.4.4 · J3 | Mediana até 5 min |
| % de serviços criados a partir de sugestão | J3 | Acompanhada |
| Tenants com pelo menos um combo; agendamentos de combo / total | DF 3.2.1 | Acompanhada (completa com a spec 009) |
| Pacotes vendidos e sessões consumidas / vendidas | DF 3.1.11 | Acompanhada (completa com as specs 009 e 012) |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Metade dos autônomos conclui o passo "Serviços e preços" do onboarding em até 5 minutos.
- **SC-002**: 100% dos agendamentos mantêm o preço e a duração da versão vigente no momento em que foram criados, mesmo após mudanças no catálogo (teste de contrato).
- **SC-003**: Uma mudança de preço com vigência futura passa a valer na data certa, sem ação manual, em 100% dos testes.
- **SC-004**: O consumidor vê, para todo combo e pacote, a economia em relação aos serviços avulsos, calculada sem erro de centavos.
- **SC-005**: Uma filial clonada oferece exatamente os mesmos serviços e preços próprios da filial de origem.
- **SC-006**: A página do estabelecimento mostra a lista de serviços em 3G, com os textos visíveis em até 3 segundos.
- **SC-007**: Nenhum saldo de pacote fica negativo em nenhum teste de concorrência e de reprocessamento (com a spec 012).

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-07** — pacote de N sessões entra na v1.0? | Escopo da história 5; specs 009, 012 e 017; oferta para saúde | **Resolvido (clarify 2026-11-25)**: entra na v1.0, venda simples |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **PEN-06** | Decidido na spec 005: preço nunca exibido em saúde; taxa de agendamento fixa |
| **C2** | Sem recurso compartilhado; o serviço não declara sala nem equipamento na v1.0 |
| **D17** | O catálogo informa o rateio do desconto do combo por etapa; a regra de absorção é da spec 007 |
| **PEN-24** (fase 2) | O momento da NFS-e de pacote fica para a spec 017; o catálogo não decide |
| Pacote: abrangência | ASSUMIDO: o tenant escolhe por pacote entre "filial da compra" e "todas as filiais do negócio" |
| Preço "a partir de" | ASSUMIDO: existe na v1.0, com o mínimo como referência de sinal |

---

## Fora do escopo desta especificação

- Quais profissionais executam cada serviço e durações ou preços por profissional (spec 007).
- Cálculo de disponibilidade, reserva atômica do combo e escolha de horário (specs 008 e 009).
- Compra do pacote, pagamento, livro-razão do saldo e estorno (spec 012).
- Política de cancelamento e no-show aplicada ao pacote (spec 010).
- Código de serviço fiscal e emissão de NFS-e (spec 017).
- Combo com troca de profissional (spec 030), duração por porte e pelagem (spec 025), turmas e planos (spec 026), vale-presente e pacotes para presente (spec 029), atendimento no endereço e orçamento (spec 033).
- Cupons e promoções (fora da v1.0; o horário ocioso é da spec 014).
- Estoque e venda de produto físico (escopo negativo, CONST 2).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: duração de 5 a 720 minutos em passos de 5; preparo e limpeza até 120 minutos; combo de 2 a 5 etapas com intervalo de até 15 minutos; pacote de 2 a 50 sessões e validade de 30 a 730 dias; até 5 fotos por serviço; onboarding de serviços em até 5 minutos.
- O Gerente cadastra serviços só da própria filial; serviços de todo o negócio são do Proprietário (interpretação de "Cadastrar serviço e preço: Gerente ✔" na DF 7 com o escopo de filial da spec 003).
- O direito de arrependimento de 7 dias (Código de Defesa do Consumidor, art. 49) vale para pacotes comprados pela internet.
- As sugestões de serviço por vertical são mantidas pela Gestão no back-office e não trazem preço.
- O preço "a partir de" só pode subir no fechamento, nunca baixar além do mínimo, e a diferença é cobrada na spec 012.
