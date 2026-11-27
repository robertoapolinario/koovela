# Feature Specification: Destaque pago na vitrine

**Feature Branch**: `032-destaque-pago`

**Created**: 2026-11-25

**Status**: Clarified

**Input**: User description: "032 destaque-pago — seguir a sequência da constituição (seção 10), fase 3: [D37]. Depende de 024 e 019. Pendências PEN-26 e PEN-30. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: painel do cliente ("Destaque na vitrine": compra e resultados) · app e web do consumidor (faixa de destaques na vitrine e nos resultados) · back-office ("Parceiros e inventário de destaques": inventário, preços, ocupação)

**Depende de**: 024 `vitrine-busca` · 019 `assinatura-koovela-cobranca` (e, por elas, a v1.0 e a fase 2)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III, IV, seções 4.4 (`discovery` +3, `billing` +3), 8 (`[PEN-30]`) e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 5.2, 5.3, 9.11, 17 (`[D36]`, `[D37]`) e 18 (`[PEN-26]`, `[PEN-30]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A visibilidade paga é uma fonte de receita da fase 3 (DF 5.2): o estabelecimento paga para aparecer em destaque na vitrine do seu bairro e da sua categoria.

A decisão `[D37]` define as regras:

- **pacote fixo por período** (por exemplo, 7 ou 30 dias), por **bairro e categoria**;
- **faixa separada**, identificada como **patrocinada**;
- **inventário limitado** por bairro e categoria;
- **a lista orgânica não muda de ordem**.

Essas regras protegem a confiança na vitrine: o consumidor sabe o que é anúncio, e o resultado orgânico (critério do `[PEN-26]`, spec 024) continua o mesmo. Os valores dos pacotes estão em aberto (`[PEN-30]`) e, pela constituição, são configuráveis no back-office, sem valor fixo no código (CONST 8).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 5.2 | Visibilidade paga | Receita de destaques |
| 3.2.2 | Aumentar volume de clientes | Agendamentos vindos do destaque |

Personas: Proprietário (compra o destaque); consumidor (vê a faixa); Gestão (inventário e preços).

---

## Clarifications

### Session 2026-11-25

- Q: Destaque pago é permitido em saúde? → A: Saúde (PEN-06, decidido na spec 005): o preço nunca aparece em nenhum lugar; taxa de agendamento fixa abatida do valor do atendimento; fica restrito só o que mostra preço. Destaque pago é permitido, sem mostrar preço.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comprar um destaque para o bairro e a categoria (Priority: P1)

Como Proprietário de um negócio na vitrine, quero escolher bairro, categoria, período e data de início, ver o preço e a disponibilidade, e pagar.

**Why this priority**: tela "Destaque na vitrine" (DF 9.11); é a receita da `[D37]`.

**Independent Test**: num negócio de teste na vitrine, comprar um destaque de 7 dias em "manicure, Pinheiros", começando na semana seguinte; conferir a reserva do espaço, a cobrança e a faixa no dia de início.

**Acceptance Scenarios**:

1. **Given** "Destaque na vitrine" no painel, **When** o Proprietário abre, **Then** vê os bairros e categorias em que o negócio (ou a filial) aparece, os pacotes disponíveis (por exemplo, 7 e 30 dias), o preço de cada um e o calendário de disponibilidade do inventário.
2. **Given** a escolha de bairro, categoria, pacote e data de início, **When** há espaço no inventário em todos os dias do período, **Then** o Proprietário pode comprar; sem espaço, vê a próxima data de início disponível.
3. **Given** a compra, **When** confirmada com reautenticação (REQ-IDN-022), **Then** o valor é cobrado na hora pela forma de pagamento da assinatura (spec 019), o espaço fica reservado para o período, e a nota fiscal da Koovela é emitida (REQ-ASS-023).
4. **Given** compras simultâneas do último espaço de um bairro e categoria num período, **When** processadas, **Then** só uma é aceita.
5. **Given** o negócio, **When** não cumpre os requisitos de elegibilidade (ativo na vitrine, perfil completo, sem pendência de pagamento, e o `[PEN-06]` em saúde), **Then** a compra não é oferecida, com o motivo.

---

### User Story 2 - Consumidor vê o destaque separado e identificado (Priority: P1)

Como consumidor, quero ver os destaques numa faixa à parte, claramente marcada como patrocinada, sem que a lista principal mude por causa de quem pagou.

**Why this priority**: a regra central da `[D37]` e a confiança na vitrine (REQ-VIT-005).

**Independent Test**: numa busca de teste com dois destaques ativos, conferir a faixa marcada "Patrocinado", e que a lista orgânica é idêntica à da mesma busca sem destaques.

**Acceptance Scenarios**:

1. **Given** uma busca ou a home da vitrine num bairro e categoria com destaques ativos, **When** os resultados aparecem, **Then** os destaques ficam numa faixa separada, com o selo "Patrocinado" em cada item, antes ou ao lado da lista orgânica.
2. **Given** a lista orgânica, **When** há destaques, **Then** a ordem orgânica é exatamente a mesma que seria sem destaques; um negócio em destaque também aparece na sua posição orgânica normal.
3. **Given** mais destaques ativos do que espaços visíveis na faixa, **When** a faixa é exibida, **Then** os destaques se revezam de forma justa entre as exibições.
4. **Given** um destaque, **When** o consumidor toca em "Patrocinado", **Then** vê a explicação: o estabelecimento pagou para aparecer nesta faixa; a lista principal não é afetada.
5. **Given** os filtros da busca (spec 024), **When** o consumidor filtra (por exemplo, "disponível hoje"), **Then** só aparecem na faixa os destaques que também atendem ao filtro.

---

### User Story 3 - Resultado do destaque (Priority: P2)

Como Proprietário, quero ver quantas vezes meu destaque apareceu, quantos tocaram nele e quantos agendaram, para saber se vale a pena.

**Why this priority**: sem resultado, o destaque não se renova.

**Independent Test**: com um destaque de teste e eventos sintéticos, abrir o resultado e conferir exibições, toques, agendamentos e receita atribuída.

**Acceptance Scenarios**:

1. **Given** um destaque ativo ou encerrado, **When** o Proprietário abre o resultado, **Then** vê por dia: exibições na faixa, toques, visitas à página, agendamentos com origem "destaque" e receita desses agendamentos.
2. **Given** a atribuição, **When** calculada, **Then** um agendamento é de origem "destaque" se foi iniciado a partir de um toque na faixa, na mesma sessão.
3. **Given** um destaque encerrado, **When** o Proprietário quer renovar, **Then** vê a disponibilidade a partir do dia seguinte ao fim.

---

### User Story 4 - Inventário e preços no back-office (Priority: P2)

Como Gestão, quero definir, por bairro e categoria, quantos espaços de destaque existem, os pacotes e os preços, e acompanhar a ocupação e a receita.

**Why this priority**: tela "Parceiros e inventário de destaques" (DF 9.11); o inventário limitado e os valores (`[PEN-30]`) são da Gestão.

**Independent Test**: no back-office, definir 3 espaços para "manicure, Pinheiros", pacotes de 7 e 30 dias com preços de teste, e conferir a ocupação depois de duas compras.

**Acceptance Scenarios**:

1. **Given** o back-office, **When** a Gestão configura uma região aberta (spec 024) e uma categoria, **Then** define o número de espaços simultâneos (padrão 3), os pacotes (duração em dias) e o preço de cada pacote, com vigência; os valores ficam versionados e sem padrão no código (`[PEN-30]`).
2. **Given** a ocupação, **When** a Gestão abre o inventário, **Then** vê por bairro e categoria os espaços vendidos por dia, a taxa de ocupação e a receita.
3. **Given** uma mudança de preço, **When** publicada, **Then** vale só para compras novas; destaques já comprados mantêm o preço pago.
4. **Given** conteúdo inadequado num negócio em destaque (denúncia, spec 024), **When** a Gestão retira o negócio da vitrine, **Then** o destaque é suspenso e, se a retirada for confirmada, não há reembolso; se a denúncia for improcedente, o período suspenso é compensado.

---

### Edge Cases

- **Negócio que sai da vitrine, fica sem horários ou é suspenso por inadimplência** durante o destaque: o destaque pausa; não há reembolso nem extensão (responsabilidade do estabelecimento).
- **Região fechada pela Koovela** (spec 024) durante o destaque: reembolso proporcional aos dias não exibidos.
- **Cancelamento pelo Proprietário antes do início**: reembolso integral até 48 horas antes do início; depois disso, sem reembolso.
- **Cancelamento depois do início**: sem reembolso.
- **Negócio com várias filiais**: o destaque é por filial, no bairro dela.
- **Saúde** (`[PEN-06]`, decidido na spec 005): destaques são vendidos, mas o item da faixa nunca mostra preço.
- **Busca fora do bairro comprado**: o destaque não aparece na faixa; o negócio continua na lista orgânica normalmente.
- **Faixa vazia**: sem destaques ativos, a faixa não aparece.

---

## Requirements *(mandatory)*

Formato: `REQ-DST-NNN (origem: …)`.

### Functional Requirements

**Compra**

- **REQ-DST-001** (origem: D37 | DF 5.2): O Proprietário DEVE poder comprar destaque por filial, escolhendo bairro, categoria, pacote (duração em dias) e data de início, dentro do inventário disponível.
- **REQ-DST-002** (origem: D37): O destaque SÓ DEVE ser vendido se houver espaço no inventário em todos os dias do período; compras simultâneas do último espaço DEVEM resultar em exatamente uma aceita.
- **REQ-DST-003** (origem: REQ-ASS-022 | REQ-ASS-023): A cobrança DEVE ser feita na hora, pela forma de pagamento da assinatura e pelo adaptador de pagamento (spec 019), com nota fiscal da Koovela; a compra exige reautenticação com segundo fator.
- **REQ-DST-004** (origem: D37 | PEN-06): Só DEVEM comprar negócios ativos na vitrine, com perfil completo, sem fatura em atraso, ; em saúde, o destaque é permitido sem mostrar preço.
- **REQ-DST-005** (origem: CDC): Cancelamento até 48 horas antes do início DEVE ter reembolso integral; depois disso, não há reembolso; região fechada pela Koovela gera reembolso proporcional.

**Exibição**

- **REQ-DST-010** (origem: D37 | REQ-VIT-005): Destaques DEVEM aparecer só numa faixa separada da lista orgânica, com o selo "Patrocinado" em cada item e explicação acessível.
- **REQ-DST-011** (origem: D37): A lista orgânica NÃO DEVE mudar de ordem por causa dos destaques; DEVE existir teste que compare a lista com e sem destaques ativos.
- **REQ-DST-012** (origem: D37): Com mais destaques que espaços visíveis, a exibição DEVE se revezar de forma justa.
- **REQ-DST-013** (origem: REQ-VIT-010): Só DEVEM aparecer na faixa os destaques que atendem aos filtros da busca e ao bairro e categoria buscados.
- **REQ-DST-014** (origem: REQ-VIT-033): Destaque de negócio fora da vitrine, sem horários ou suspenso DEVE pausar, sem reembolso nem extensão.

**Resultado**

- **REQ-DST-020** (origem: DF 3.2.2): O Proprietário DEVE ver, por dia, exibições, toques, visitas, agendamentos com origem "destaque" e a receita deles.
- **REQ-DST-021** (origem: DF 14): Um agendamento DEVE ter origem "destaque" quando iniciado a partir de um toque na faixa, na mesma sessão.

**Inventário e preços**

- **REQ-DST-030** (origem: D37 | PEN-30 | CONST 8): A Gestão DEVE configurar, por região aberta e categoria, o número de espaços simultâneos (padrão 3), os pacotes e os preços, versionados e sem valor fixo no código.
- **REQ-DST-031** (origem: DF 9.11): O back-office DEVE mostrar ocupação por dia, taxa de ocupação e receita por bairro e categoria.
- **REQ-DST-032** (origem: CONST III): Mudanças de preço valem só para compras novas.
- **REQ-DST-033** (origem: REQ-VIT-050): Retirada de negócio por moderação DEVE suspender o destaque; denúncia improcedente DEVE compensar o período suspenso.
- **REQ-DST-034** (origem: CONST V): Compras, cancelamentos, reembolsos e mudanças de inventário e preço DEVEM gerar registro na trilha de auditoria.

**Isolamento**

- **REQ-DST-040** (origem: CONST II): Destaques e inventário ficam no domínio `discovery` (espaço global da vitrine); a cobrança fica em `billing`; os resultados mostrados ao Proprietário são agregados e nunca identificam consumidores.

### Key Entities

- **Espaço de inventário** (`sponsored_slot`): região, categoria, quantidade simultânea, pacotes e preços (versionados).
- **Destaque comprado**: filial, região, categoria, pacote, início, fim, preço pago, estado.
- **Exibição e toque** (agregados): destaque, dia, contagens.
- **Atribuição**: destaque, agendamento, receita.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| Painel do cliente | Destaque na vitrine | Registrado no plano |
| App do consumidor | Vitrine com faixa de destaques | Registrado no plano |
| Web do consumidor | Resultados com faixa de destaques | Registrado no plano |
| Back-office | Parceiros e inventário de destaques (parte de inventário) | Registrado no plano |

---

## Regras e estados

- **Destaque**: `reservado` (pago, antes do início) → `ativo` ↔ `pausado` (negócio indisponível ou retirado) → `encerrado` · `reservado` → `cancelado` (até 48 horas antes, com reembolso) · `ativo` → `reembolsado_parcial` (região fechada pela Koovela).
- **Inventário**: por região, categoria e dia, espaços vendidos ≤ espaços configurados.
- **Lista orgânica**: idêntica com ou sem destaques.

---

## Dados pessoais

Esta spec não coleta dado pessoal novo. Exibições e toques são guardados agregados por destaque e dia; a atribuição usa o agendamento (spec 009) sem expor o consumidor ao Proprietário. Base legal para a medição: legítimo interesse (LGPD art. 7, IX), com a Koovela como controladora da vitrine.

---

## Permissões

| Ação | Proprietário | Gerente | Comercial/Growth | Fin/Ops |
|---|---|---|---|---|
| Comprar, cancelar e ver resultado do destaque | ✔ | ✔ filial (ver resultado) | — | — |
| Configurar inventário, pacotes e preços | — | — | ✔ (com aprovação do Fin/Ops) | ✔ |
| Ver ocupação e receita de destaques | — | — | ✔ | ✔ |
| Reembolsos fora da regra | — | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `discovery.sponsored_slot.purchased.v1` / `.started.v1` / `.paused.v1` / `.ended.v1` / `.cancelled.v1` | Ciclo do destaque |
| `discovery.sponsored_slot.impression_counted.v1` / `.clicked.v1` | Exibição e toque (agregáveis) |
| `billing.sponsored_slot.charged.v1` / `.refunded.v1` | Cobrança e reembolso |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Receita de destaques | DF 5.2 | Acompanhada |
| Ocupação do inventário por região e categoria | `[D37]` | Acompanhada |
| Toques por exibição e agendamentos por destaque | DF 3.2.2 | Acompanhada |
| Renovação de destaques | DF 5.2 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, a lista orgânica é idêntica com e sem destaques ativos.
- **SC-002**: 100% dos itens da faixa têm o selo "Patrocinado".
- **SC-003**: Nenhum bairro e categoria vende mais espaços que o configurado, em 100% dos testes de concorrência.
- **SC-004**: O Proprietário compra um destaque em até 2 minutos.
- **SC-005**: O Proprietário vê exibições, toques e agendamentos do destaque em até 2 toques.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma. Os valores dos pacotes (`[PEN-30]`) são configuráveis no back-office, como manda a CONST 8, e não bloqueiam a spec.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-26** — ordenação orgânica e base mínima por região | Spec 024 | Destaques só existem em regiões abertas; a ordem orgânica não é afetada |
| **PEN-30** — valores dos pacotes | Back-office | Configuráveis, sem padrão no código |
| **PEN-06** — publicidade em saúde | Spec 005 | Decidido: destaque permitido sem preço |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Espaços | ASSUMIDO: 3 espaços simultâneos por bairro e categoria |
| Cobrança | ASSUMIDO: na hora da compra, pela forma de pagamento da assinatura |
| Cancelamento | ASSUMIDO: reembolso integral até 48 horas antes do início |
| Pausa por culpa do estabelecimento | ASSUMIDO: sem reembolso nem extensão |

---

## Fora do escopo desta especificação

- Leilão de posições ou preço por clique.
- Destaque na lista orgânica ou acima dela misturado aos resultados.
- Anúncios fora da vitrine (notificações, e-mail).
- Destaque para profissionais individuais.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: 3 espaços por bairro e categoria; pacotes de 7 e 30 dias como exemplo (DF 5.2); reembolso até 48 horas antes; compra em até 2 minutos.
- A atribuição considera só a mesma sessão, sem rastreamento entre sessões.
- Os domínios donos são `discovery` (faixa, inventário, exibição) e `billing` (cobrança), conforme a CONST 4.4.
