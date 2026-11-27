# Feature Specification: Agendamento e ciclo de vida

**Feature Branch**: `009-agendamento-ciclo-de-vida`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "009 agendamento-ciclo-de-vida — seguir a sequência da constituição (seção 10): J1 completo, máquina de estados, remarcação, cancelamento. Depende de 008. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: app do consumidor e web do consumidor (Meus agendamentos, Resumo, Confirmação, Remarcar e cancelar) · painel do cliente (Agenda do dia, Agenda da semana por colaborador, Novo agendamento manual) · app do colaborador e `/pro` (Agenda do dia, Detalhe com check-in e check-out) · back-office (consulta em sessão de suporte)

**Depende de**: 008 `motor-agenda-disponibilidade` (e, por ela, 002 a 007)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, II, III, IV, IX, XI, seções 6, 7, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.1, 3.1, 3.2, 3.3, 6, 6.1, 7, 8 (J1, J6, J9), 9.1, 9.3, 9.4, 9.8, 9.9, 10.1, 10.8, 14 e 18 (`[C1]`, `[C5]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O agendamento é a **entidade central** do domínio (DF 6). Tudo o que a Koovela cobra, paga, lembra, avalia e recompensa nasce dele. A North Star do produto é "atendimentos concluídos e pagos por mês" (CONST 7, DF 14).

Esta spec entrega a **J1 completa** (DF 8): da chegada pelo link ou QR até o atendimento concluído, passando pela escolha de serviço, profissional e horário, pelo resumo com a política, pela confirmação e pela remarcação ou cancelamento. Entrega também o lado da equipe: a agenda do dia, a agenda da semana e o agendamento manual pela Recepção.

O ciclo de vida é uma **máquina de estados explícita** (CONST I, DF 10.1): cada transição publica um evento e registra quem a fez e quando. Um agendamento concluído **nunca** é excluído (DF 6.1, invariante 5).

Várias peças da J1 pertencem a outras specs, que esta spec orquestra por contrato: cadastro etapa 1 e 2 (003), página e catálogo (005, 006), horários e reserva (008), política de cancelamento e no-show (010), lembretes (011), pagamento e sinal (012), avaliação (016) e pontos (015). Enquanto uma dessas specs não estiver implementada, a J1 funciona sem a etapa correspondente (por exemplo, sem pagamento online, com pagamento no local).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.2 | Agendar e controlar agendamentos | Tempo até confirmação |
| 3.1.6 | Remarcar sem telefonema | % de remarcações no app |
| 3.1.8 | Voltar ao mesmo profissional | % com profissional escolhido |
| 3.2.10 | Provar o que foi feito | % com check-in e registro |
| 3.2.13 | Não depender do WhatsApp pessoal | % de agendamentos fora do canal manual |
| 3.3.1 | Aumentar volume de atendimento | Ocupação pessoal |
| DF 14 | North Star e ativação | Atendimentos concluídos e pagos; % de tenants com 1º agendamento em 7 dias |

Personas: consumidor; Recepção; Gerente; Proprietário; Colaborador; Suporte (em sessão de suporte).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor agenda do link à confirmação (Priority: P1)

Como consumidor que chegou pelo link ou QR, quero escolher serviço, profissional e horário, ver o resumo com a política e confirmar, terminando numa tela de confirmação clara (J1).

**Why this priority**: é a jornada que gera toda a receita e a North Star.

**Independent Test**: num tenant de teste, abrir o link no app e na web, entrar com OTP, escolher serviço, profissional e horário, confirmar, e ver o agendamento em "Meus agendamentos" e na agenda do dia do painel e do colaborador.

**Acceptance Scenarios**:

1. **Given** um consumidor na página do estabelecimento, **When** escolhe serviço (ou combo), profissional (ou "qualquer profissional") e horário, **Then** o horário fica segurado (spec 008) e um agendamento em `RASCUNHO` é criado com a origem (link, QR, direto, app ou web).
2. **Given** um agendamento em `RASCUNHO`, **When** o consumidor chega ao resumo, **Then** vê serviço, profissional, data e hora no fuso da filial, endereço, duração, preço e a política de cancelamento vigente (spec 010; sem política configurada, o texto padrão "cancelamento gratuito até o horário").
3. **Given** o resumo, **When** o consumidor sem conta ou só com etapa 1 confirma, **Then** é levado ao cadastro etapa 1 ou 2 (spec 003) somente se o fluxo exigir, e volta ao resumo sem perder o horário.
4. **Given** um agendamento que não exige pagamento online, **When** o consumidor confirma, **Then** o agendamento vai direto para `CONFIRMADO`; se exigir pagamento ou sinal (specs 010 e 012), vai para `PENDENTE_PAGAMENTO` e só passa a `CONFIRMADO` com o pagamento aprovado.
5. **Given** a confirmação, **When** concluída, **Then** o consumidor vê a tela de confirmação com o resumo, o endereço completo (inclusive o que o autônomo ocultou na página, spec 005), o caminho no mapa, a opção de adicionar ao calendário do aparelho e o próximo passo ("você vai receber um lembrete"), como exige a CONST XI.
6. **Given** um agendamento confirmado, **When** isso acontece, **Then** ele aparece em até 5 segundos na agenda do painel e do colaborador e em "Meus agendamentos" do consumidor.
7. **Given** um pagamento não concluído no prazo da reserva temporária (spec 008), **When** o prazo vence, **Then** o agendamento vai para `EXPIRADO`, o horário é liberado e o consumidor é avisado na tela.
8. **Given** a jornada completa, **When** medida para um consumidor que já tem conta, **Then** leva no máximo 3 minutos (mediana) da página do estabelecimento à confirmação.

---

### User Story 2 - "Meus agendamentos" em todos os estabelecimentos (Priority: P1)

Como consumidor, quero ver numa única lista meus próximos agendamentos e o histórico, de todos os estabelecimentos em que agendei, no app e na web.

**Why this priority**: é a tela inicial do app (DF 9.1, "Meus agendamentos (home, sem busca)") e a resposta ao `[C5]`.

**Independent Test**: com o mesmo consumidor agendando em dois tenants sintéticos, abrir "Meus agendamentos" e conferir os dois, com o estado certo, sem que um tenant veja o outro.

**Acceptance Scenarios**:

1. **Given** um consumidor com agendamentos em dois estabelecimentos, **When** abre "Meus agendamentos", **Then** vê os próximos em ordem de data e o histórico, com estabelecimento, serviço, profissional, data, hora, estado e ações disponíveis.
2. **Given** a lista, **When** um estabelecimento muda um agendamento, **Then** a lista reflete a mudança em até 5 segundos.
3. **Given** a lista, **When** montada, **Then** vem de uma projeção construída por eventos (CONST II, `[C5]`); nenhuma consulta lê o espaço de dados de um tenant a partir de outro.
4. **Given** um agendamento passado concluído, **When** o consumidor o abre, **Then** pode agendar de novo o mesmo serviço com o mesmo profissional em um toque (DF 3.1.8).

---

### User Story 3 - Remarcar e cancelar sem telefonema (Priority: P1)

Como consumidor, quero remarcar ou cancelar pelo app ou pela web, vendo antes o que acontece segundo a política do estabelecimento.

**Why this priority**: DF 3.1.6; remarcar em vez de faltar reduz no-show (DF 3.2.8).

**Independent Test**: com um agendamento confirmado, remarcar para outro horário e conferir o vínculo entre o antigo e o novo; depois cancelar o novo e conferir estado, evento e liberação do horário.

**Acceptance Scenarios**:

1. **Given** um agendamento `CONFIRMADO`, **When** o consumidor escolhe "remarcar", **Then** vê os horários livres (spec 008) do mesmo serviço e profissional (ou de outro, se quiser) e, antes de confirmar, o que a política permite (spec 010).
2. **Given** uma remarcação confirmada, **When** concluída, **Then** o agendamento antigo vai para `REAGENDADO`, um novo agendamento é criado já `CONFIRMADO`, ligado ao antigo, com os mesmos preço, política e pagamento do original, e o horário antigo é liberado; ocupar o novo e liberar o antigo acontecem juntos.
3. **Given** um agendamento, **When** o consumidor escolhe "cancelar", **Then** vê a consequência (cancelamento gratuito, multa ou perda do sinal, conforme spec 010), informa um motivo opcional e confirma; o agendamento vai para `CANCELADO_USUARIO` e o horário é liberado.
4. **Given** a política do estabelecimento, **When** o consumidor tenta remarcar ou cancelar fora do que ela permite, **Then** o app mostra a regra e o contato do estabelecimento, sem executar a ação.
5. **Given** um agendamento remarcado, **When** remarcado de novo, **Then** a cadeia de remarcações fica registrada; o número máximo de remarcações segue a spec 010 (padrão: sem limite até ela existir).

---

### User Story 4 - Equipe opera a agenda (Priority: P1)

Como Recepção, Gerente ou Proprietário, quero ver a agenda do dia e da semana por colaborador, criar agendamentos manuais para quem liga ou chega, e remarcar, trocar de profissional ou cancelar pelo estabelecimento.

**Why this priority**: o painel é onde o estabelecimento vive o dia; sem ele, a Koovela não substitui o caderno e o WhatsApp (DF 3.2.13).

**Independent Test**: no painel, abrir a agenda do dia de uma filial com 3 colaboradores, criar um agendamento manual para um consumidor novo (nome e celular), mover um agendamento para outro profissional e cancelar outro pelo estabelecimento.

**Acceptance Scenarios**:

1. **Given** a Recepção no painel, **When** abre a agenda do dia, **Then** vê, por colaborador em colunas, os agendamentos com horário, consumidor, serviço e estado, os horários livres, as folgas e os bloqueios (spec 007); a agenda da semana mostra um colaborador por vez.
2. **Given** um agendamento manual, **When** a Recepção busca o consumidor por celular ou nome, **Then** encontra quem já agendou no tenant; se não houver, cadastra nome e celular, e o consumidor recebe aviso do agendamento (spec 011) com convite para confirmar o próprio cadastro por OTP.
3. **Given** um agendamento manual, **When** confirmado pela equipe, **Then** vai para `CONFIRMADO` com origem "manual" e o ator registrado; se o horário estiver fora da escala, exige a confirmação explícita da spec 008.
4. **Given** um agendamento, **When** a equipe troca o profissional por outro que executa o serviço no mesmo horário, **Then** o consumidor é avisado e, se tinha escolhido o profissional, pode cancelar sem custo.
5. **Given** um agendamento, **When** o estabelecimento cancela, **Then** precisa informar o motivo; o agendamento vai para `CANCELADO_ESTABELECIMENTO`, o consumidor é avisado, e qualquer valor pago é devolvido integralmente (spec 012), sem multa.
6. **Given** a lista de agendamentos afetados por mudança de horário, escala ou folga (specs 005 e 007), **When** a equipe a abre, **Then** pode remarcar, trocar o profissional ou cancelar cada um, ou vários de uma vez, com aviso aos consumidores.
7. **Given** um Gerente da filial X, **When** abre a agenda, **Then** vê só a filial X; o Proprietário vê todas (DF 7).

---

### User Story 5 - Colaborador vê a agenda e registra o atendimento (Priority: P1)

Como Colaborador, quero ver minha agenda do dia no app, mesmo sem internet, e registrar check-in e check-out de cada atendimento, para provar o que foi feito (DF 3.2.10).

**Why this priority**: o check-out é o que leva o agendamento a `CONCLUIDO`, que libera pagamento final, comissão, nota, avaliação e pontos.

**Independent Test**: no app do colaborador, abrir a agenda do dia, desligar a rede, conferir que a agenda continua legível, fazer check-in e check-out sem rede, religar e conferir que os estados chegam ao painel.

**Acceptance Scenarios**:

1. **Given** o Colaborador no app, **When** abre "Agenda do dia", **Then** vê os próprios agendamentos do dia, com horário, consumidor (nome), serviço, observações e estado.
2. **Given** a agenda dos próximos 7 dias, **When** o aparelho fica sem rede, **Then** ela continua legível no app com a hora da última atualização (CONST XI).
3. **Given** um agendamento `CONFIRMADO`, **When** o Colaborador (ou a Recepção) faz check-in a partir de 30 minutos antes do horário, **Then** ele vai para `EM_ATENDIMENTO`.
4. **Given** um agendamento `EM_ATENDIMENTO`, **When** faz check-out, **Then** ele vai para `CONCLUIDO`; se o serviço tem preço "a partir de" (spec 006), o valor final é informado no check-out e o consumidor é avisado antes de qualquer cobrança da diferença (spec 012).
5. **Given** check-in ou check-out sem rede, **When** a conexão volta, **Then** a ação é enviada com o horário do aparelho marcado como "registrado sem conexão" e o horário de recebimento; se o estado tiver mudado no servidor nesse meio-tempo, prevalece o servidor e o Colaborador é avisado.
6. **Given** um agendamento `CONCLUIDO`, **When** isso acontece, **Then** é publicado o evento que dispara pagamento final, comissão, nota, avaliação e pontos nas specs 012, 007, 017, 016 e 015.

---

### User Story 6 - Não comparecimento e expiração (Priority: P2)

Como estabelecimento, quero marcar quando o consumidor não veio; como plataforma, quero que agendamentos abandonados não fiquem segurando horário.

**Why this priority**: o no-show é a dor com maior disposição a pagar (DF 3.2.8); o registro do estado é a base da política (spec 010).

**Independent Test**: com um agendamento confirmado no passado, marcar como não comparecimento após a tolerância; conferir que antes da tolerância a ação não aparece.

**Acceptance Scenarios**:

1. **Given** um agendamento `CONFIRMADO`, **When** passam 15 minutos do horário sem check-in (tolerância padrão, ajustável pela spec 010), **Then** a equipe pode marcá-lo como `NO_SHOW`.
2. **Given** um agendamento `CONFIRMADO` sem check-in, **When** termina o dia da filial, **Then** ele aparece numa lista "pendentes de registro" para a equipe decidir entre concluído (atendido sem registro) e não comparecimento; não muda de estado sozinho.
3. **Given** a marcação de `NO_SHOW`, **When** feita, **Then** registra ator e horário, publica evento para a spec 010 (multa, sinal, J6) e avisa o consumidor.
4. **Given** uma marcação de `NO_SHOW` por engano, **When** corrigida pela equipe em até 48 horas, **Then** volta para o estado anterior com registro da correção; as consequências já aplicadas são revertidas pela spec 010.

---

### User Story 7 - Regras congeladas e histórico completo (Priority: P2)

Como estabelecimento e como consumidor, quero que cada agendamento guarde as regras do momento em que foi feito e o histórico de tudo o que aconteceu com ele.

**Why this priority**: CONST III (regra versionada e congelada) e CONST I (transição registrada); base de qualquer disputa, estorno ou suporte.

**Independent Test**: criar um agendamento, mudar preço, comissão e política, e conferir que o agendamento mantém as versões originais; consultar o histórico de transições.

**Acceptance Scenarios**:

1. **Given** um agendamento criado, **When** consultado, **Then** guarda as versões vigentes no momento da criação: serviço e preço (006), duração e preço do profissional e regra de comissão (007), política de cancelamento e no-show (010) e regra de fidelidade (015), quando existirem.
2. **Given** qualquer transição de estado, **When** acontece, **Then** fica no histórico do agendamento com estado anterior, novo, ator, origem (app, web, painel, app do colaborador, sistema), motivo e horário, e é publicada como evento.
3. **Given** um agendamento `CONCLUIDO`, **When** alguém tenta excluí-lo, **Then** é recusado; só existem estorno (spec 012) e registro de correção.
4. **Given** uma transição não permitida (por exemplo, `CANCELADO_USUARIO` → `CONFIRMADO`), **When** pedida, **Then** é recusada.

---

### Edge Cases

- **Dois cancelamentos simultâneos** (consumidor e estabelecimento): vale a primeira transição gravada; a segunda recebe o estado atual.
- **Consumidor com etapa 1 tentando agendar serviço que exige pagamento**: é levado à etapa 2 (spec 003) e ao pagamento (spec 012); o horário continua segurado dentro do limite da spec 008.
- **Limite de agendamentos futuros**: um consumidor pode ter até 5 agendamentos futuros por estabelecimento; acima disso, a Recepção pode agendar com confirmação (proteção contra agendamento em massa, CONST 5).
- **Combo cancelado**: cancelar o agendamento libera todas as etapas.
- **Remarcação de combo**: todas as etapas são reservadas de novo, de forma atômica (spec 008).
- **Estabelecimento suspenso** (spec 002) com agendamentos futuros: os agendamentos continuam visíveis ao consumidor com aviso "estabelecimento indisponível; entre em contato"; nenhuma nova reserva é aceita.
- **Colaborador com vínculo encerrado** (spec 007): seus agendamentos futuros precisam ser resolvidos antes da data de fim.
- **Observação do consumidor com dado de saúde** (por exemplo, numa clínica): o campo é tratado como dado sensível, cifrado, visível só à equipe da filial, e a tela avisa o que não escrever.
- **Fuso do consumidor diferente do da filial**: todas as telas mostram o horário da filial, com o fuso indicado.
- **Agendamento manual para consumidor que nunca confirma o cadastro**: o agendamento vale normalmente; o pré-cadastro fica ligado ao celular e é assumido quando a pessoa verificar o OTP (spec 003).
- **Consumidor que pede exclusão da conta** (spec 003) com agendamentos futuros: eles são cancelados conforme a política de cada estabelecimento, como já informado no pedido.

---

## Requirements *(mandatory)*

Formato: `REQ-AGE-NNN (origem: …)`.

### Functional Requirements

**Máquina de estados**

- **REQ-AGE-001** (origem: CONST I | DF 10.1): O agendamento DEVE seguir a máquina de estados `RASCUNHO → PENDENTE_PAGAMENTO → CONFIRMADO → EM_ATENDIMENTO → CONCLUIDO`, com os ramos `CANCELADO_USUARIO`, `CANCELADO_ESTABELECIMENTO`, `NO_SHOW`, `REAGENDADO` e `EXPIRADO`, e apenas as transições da tabela de "Regras e estados".
- **REQ-AGE-002** (origem: CONST I | CONST IX): Toda transição DEVE publicar evento pelo padrão outbox e registrar estado anterior, novo, ator, origem, motivo e horário.
- **REQ-AGE-003** (origem: CONST I | DF 6.1 inv. 5): Agendamento `CONCLUIDO` NÃO DEVE ser excluído; só estornado (spec 012) ou corrigido com registro.
- **REQ-AGE-004** (origem: CONST VIII): DEVE existir teste de propriedade sobre a máquina de estados (nenhuma sequência de comandos leva a transição proibida), como portão de merge.

**Criação e confirmação (J1)**

- **REQ-AGE-010** (origem: J1 | DF 6): O agendamento DEVE ter: tenant, negócio, filial, serviço ou combo (com etapas), profissional, consumidor (identificador global), janela (início, fim, fuso), origem (link, QR, direto, manual, recorrência, fila de espera, horário ocioso; e canal app, web, painel ou app do colaborador), estado, observação opcional e as versões congeladas.
- **REQ-AGE-011** (origem: J1 | REQ-AGD-031): A escolha do horário DEVE criar o agendamento em `RASCUNHO` com reserva temporária (spec 008); a expiração da reserva leva a `EXPIRADO`.
- **REQ-AGE-012** (origem: J1 | CONST IV): O fluxo DEVE pedir cadastro etapa 1 ou 2 (spec 003) apenas quando necessário e voltar ao resumo sem perder o horário.
- **REQ-AGE-013** (origem: J1 | PEN-15): O agendamento sem pagamento online exigido DEVE ir de `RASCUNHO` a `CONFIRMADO`; o que exige pagamento ou sinal DEVE passar por `PENDENTE_PAGAMENTO` e confirmar só com o pagamento aprovado (spec 012). A exigência é decidida pelas specs 010 e 012; até elas existirem, nenhum agendamento exige pagamento online.
- **REQ-AGE-014** (origem: CONST XI): Toda confirmação DEVE terminar na tela de confirmação com resumo, endereço completo, mapa, opção de adicionar ao calendário e próximo passo.
- **REQ-AGE-015** (origem: CONST III): Na criação, o agendamento DEVE congelar as versões vigentes de serviço e preço (REQ-CAT-021), de duração e preço do profissional e regra de comissão (REQ-EQP-011, REQ-EQP-045), de política (spec 010) e de regra de fidelidade (spec 015), quando existirem.
- **REQ-AGE-016** (origem: REQ-NEG-045): A origem registrada na visita à página (link, QR, direto) DEVE ser levada ao agendamento.
- **REQ-AGE-017** (origem: CONST 5): Um consumidor NÃO DEVE ter mais de 5 agendamentos futuros por estabelecimento pelo app ou pela web; a equipe pode passar do limite com confirmação.
- **REQ-AGE-018** (origem: CONST IV | edge case): A observação do consumidor DEVE ter até 300 caracteres, ser cifrada, ficar visível só à equipe da filial e, nas verticais de saúde, ser tratada como dado sensível.

**"Meus agendamentos"**

- **REQ-AGE-020** (origem: C5 | CONST II | DF 9.1): DEVE existir a projeção global de agendamentos do consumidor (`consumer_appointments_index`), alimentada por eventos de todos os tenants, com os dados necessários à lista (estabelecimento, serviço, profissional, data, estado, ações).
- **REQ-AGE-021** (origem: CONST II): A projeção NÃO DEVE ser lida por tenants; cada tenant vê só os próprios agendamentos no próprio espaço de dados.
- **REQ-AGE-022** (origem: DF 3.1.8): A partir de um agendamento concluído, o consumidor DEVE poder agendar de novo o mesmo serviço com o mesmo profissional.

**Remarcação e cancelamento**

- **REQ-AGE-030** (origem: DF 3.1.6 | DF 10.1): A remarcação DEVE levar o original a `REAGENDADO` e criar novo agendamento `CONFIRMADO` ligado a ele, mantendo preço, versões congeladas e pagamento do original; ocupar a nova janela e liberar a antiga DEVEM acontecer de forma atômica.
- **REQ-AGE-031** (origem: DF 10.3 | spec 010): Antes de remarcar ou cancelar, o consumidor DEVE ver a consequência segundo a política congelada; ações não permitidas pela política NÃO DEVEM ser executadas pelo consumidor.
- **REQ-AGE-032** (origem: DF 10.1): O cancelamento pelo consumidor DEVE levar a `CANCELADO_USUARIO`, com motivo opcional; pelo estabelecimento, a `CANCELADO_ESTABELECIMENTO`, com motivo obrigatório, aviso ao consumidor e devolução integral de valores pagos (spec 012).
- **REQ-AGE-033** (origem: REQ-EQP-022 | REQ-NEG-032): A equipe DEVE poder resolver agendamentos afetados por mudanças de horário, escala, folga ou troca (remarcar, trocar profissional, cancelar), um a um ou em lote, com aviso aos consumidores.
- **REQ-AGE-034** (origem: DF 3.1.8): A troca de profissional pelo estabelecimento DEVE avisar o consumidor e, se ele tinha escolhido o profissional, permitir cancelamento sem custo.

**Agenda da equipe**

- **REQ-AGE-040** (origem: DF 9.3): O painel DEVE ter "Agenda do dia" (colaboradores em colunas, com ocupações, horários livres, folgas e bloqueios) e "Agenda da semana por colaborador", filtradas pelo escopo do papel.
- **REQ-AGE-041** (origem: DF 9.3 "Novo agendamento manual"): A equipe DEVE poder criar agendamento manual buscando o consumidor por celular ou nome entre os que já agendaram no tenant, ou cadastrando nome e celular de um consumidor novo, sem OTP.
- **REQ-AGE-042** (origem: C5 | CONST IV): O consumidor cadastrado pela equipe DEVE ficar como pré-cadastro na identidade global, ligado ao celular, até verificar o OTP; o pré-cadastro só é visível ao tenant que o criou até a verificação, e o consumidor é avisado do agendamento (spec 011).
- **REQ-AGE-043** (origem: DF 9.3): A agenda do painel DEVE refletir mudanças em até 5 segundos sem recarregar a página.

**Atendimento**

- **REQ-AGE-050** (origem: DF 9.4 | DF 3.2.10): O check-in DEVE ser possível a partir de 30 minutos antes do horário, pelo Colaborador ou pela equipe, e levar a `EM_ATENDIMENTO`; o check-out leva a `CONCLUIDO`.
- **REQ-AGE-051** (origem: REQ-CAT-005): No check-out de serviço com preço "a partir de", o valor final DEVE ser informado e não pode ser menor que o mínimo; o consumidor é avisado antes de qualquer cobrança da diferença.
- **REQ-AGE-052** (origem: CONST XI): O app do colaborador DEVE manter a agenda dos próximos 7 dias legível sem rede, com a hora da última atualização; check-in e check-out sem rede DEVEM ser enviados ao reconectar, marcados como "registrado sem conexão", e o estado do servidor prevalece em conflito.
- **REQ-AGE-053** (origem: CONST IX | J1): A conclusão DEVE publicar o evento que alimenta pagamento final, comissão, nota fiscal, avaliação e pontos.

**Não comparecimento e pendências**

- **REQ-AGE-060** (origem: DF 10.1 | J6): A equipe DEVE poder marcar `NO_SHOW` após a tolerância (padrão 15 minutos, ajustável pela spec 010) sem check-in.
- **REQ-AGE-061** (origem: DF 3.2.10): Agendamentos `CONFIRMADO` sem check-in ao fim do dia da filial DEVEM ir para a lista "pendentes de registro", sem mudar de estado sozinhos.
- **REQ-AGE-062** (origem: CONST I): A marcação de `NO_SHOW` DEVE poder ser corrigida pela equipe em até 48 horas, com registro; a reversão das consequências é da spec 010.

**Isolamento e eventos**

- **REQ-AGE-070** (origem: CONST II | REQ-TEN-044): Todos os contratos desta spec DEVEM entrar na suíte de isolamento de tenant.
- **REQ-AGE-071** (origem: CONST VII | CONST IX): Os eventos desta spec DEVEM ser versionados e conter apenas identificadores (sem PII em claro).
- **REQ-AGE-072** (origem: CONST 6): Confirmar um agendamento DEVE levar até 2 segundos (p95) do toque à tela de confirmação, excluindo o tempo de pagamento.

### Key Entities

- **Agendamento** (`appointment`): tenant, negócio, filial, consumidor, profissional, serviço ou combo, janela, fuso, origem, canal, estado, observação (cifrada), valor final, agendamento original (se remarcado), versões congeladas.
- **Etapa do agendamento**: agendamento, etapa do combo, serviço, janela, ocupação (spec 008).
- **Transição**: agendamento, estado anterior, novo, ator, origem, motivo, horário.
- **Versões congeladas**: serviço, preço, duração, regra de comissão, política, regra de fidelidade.
- **Projeção "Meus agendamentos"** (global): consumidor, tenant, negócio, filial, serviço, profissional, data, estado, ações permitidas.
- **Pré-cadastro de consumidor** (global, spec 003): celular, nome, tenant que criou, estado de verificação.
- **Pendência de registro**: agendamento, data, resolução.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Meus agendamentos (home) · Resumo e política de cancelamento · Confirmação · Remarcar e cancelar | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Meus agendamentos · Resumo e política · Confirmação · Remarcar e cancelar (janela) | `W..` registrados no plano |
| Painel (DF 9.3) | Agenda do dia · Agenda da semana por colaborador · Novo agendamento manual | Códigos do Figma registrados no plano |
| App do colaborador (DF 9.4) | Agenda do dia · Detalhe com check-in e check-out | Códigos do Figma registrados no plano |
| Colaborador desktop (DF 9.9) | Agenda do dia · Atendimento com check-in e check-out | Códigos do Figma registrados no plano |

As telas de etapa 1 e 2 (003), página e serviço (005, 006), profissional e horário (008), meio de pagamento e checkout (012) e avaliação (016) são das specs indicadas; esta spec as encadeia.

---

## Regras e estados

| De | Para | Quem dispara |
|---|---|---|
| — | `RASCUNHO` | Escolha do horário (consumidor) ou início do agendamento manual |
| `RASCUNHO` | `CONFIRMADO` | Confirmação sem pagamento online exigido; agendamento manual |
| `RASCUNHO` | `PENDENTE_PAGAMENTO` | Confirmação com pagamento ou sinal exigido |
| `RASCUNHO` ou `PENDENTE_PAGAMENTO` | `EXPIRADO` | Fim da reserva temporária (spec 008) ou do prazo do pagamento |
| `PENDENTE_PAGAMENTO` | `CONFIRMADO` | Pagamento aprovado (spec 012) |
| `PENDENTE_PAGAMENTO` ou `CONFIRMADO` | `CANCELADO_USUARIO` | Consumidor, dentro da política |
| `PENDENTE_PAGAMENTO` ou `CONFIRMADO` | `CANCELADO_ESTABELECIMENTO` | Equipe, com motivo |
| `CONFIRMADO` | `REAGENDADO` | Remarcação (cria novo agendamento `CONFIRMADO`) |
| `CONFIRMADO` | `EM_ATENDIMENTO` | Check-in |
| `CONFIRMADO` | `NO_SHOW` | Equipe, após a tolerância |
| `NO_SHOW` | `CONFIRMADO` ou `CONCLUIDO` | Correção pela equipe em até 48 h |
| `EM_ATENDIMENTO` | `CONCLUIDO` | Check-out |
| `CONFIRMADO` (pendente de registro) | `CONCLUIDO` | Equipe, "atendido sem registro" |

Regras: estados finais são `CONCLUIDO`, `CANCELADO_USUARIO`, `CANCELADO_ESTABELECIMENTO`, `REAGENDADO` e `EXPIRADO`; `NO_SHOW` é final após 48 horas. Nenhum agendamento é excluído depois de sair de `RASCUNHO`.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Identificador do consumidor no agendamento | Pseudônimo | Execução de contrato (art. 7, V) | 5 anos após o atendimento (guarda fiscal), depois anonimizado (spec 022, `[C4]`) | Equipe da filial; o próprio consumidor |
| Nome e celular do consumidor exibidos à equipe | Pessoal | Execução de contrato; o tenant é controlador (CONST IV) | Enquanto houver relação com o tenant; conforme spec 022 | Equipe da filial; Proprietário |
| Observação do consumidor | Pessoal; sensível em saúde | Execução de contrato; em saúde, tutela da saúde (art. 11, II, f) | Igual ao agendamento | Equipe da filial |
| Pré-cadastro feito pela equipe | Pessoal | Execução de contrato a pedido do titular | Até a verificação por OTP; sem verificação, 12 meses após o último agendamento | Tenant que criou |
| Projeção "Meus agendamentos" | Pessoal | Execução de contrato | Igual ao agendamento | Só o próprio consumidor |
| Histórico de transições | Pessoal (atores) | Execução de contrato e segurança | Igual ao agendamento | Equipe da filial; SRE |

Regras: eventos e logs não carregam nome, celular nem observação (CONST IV e IX); a equipe vê o celular completo só dos consumidores com agendamento no próprio tenant.

---

## Permissões

Recorte da matriz RBAC (DF 7):

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte |
|---|---|---|---|---|---|---|
| Agendar | ✔ | — | ✔ | ✔ | ✔ | ✔* |
| Ver própria agenda | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* |
| Ver agenda de terceiros | — | — | ✔ filial | ✔ filial | ✔ rede | ✔* |
| Cancelar e remarcar | ✔ próprio | ✔ próprio | ✔ | ✔ | ✔ | ✔* |
| Trocar profissional; resolver afetados em lote | — | — | ✔ filial | ✔ filial | ✔ | ✔* |
| Check-in e check-out | — | ✔ próprio | ✔ filial | ✔ filial | ✔ | — |
| Marcar e corrigir não comparecimento | — | ✔ próprio | ✔ filial | ✔ filial | ✔ | — |

`✔*` = apenas em sessão de suporte (spec 003). "Cancelar e remarcar próprio" do Colaborador vale para os próprios atendimentos, como estabelecimento.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `scheduling.appointment.drafted.v1` | `RASCUNHO` criado |
| `scheduling.appointment.payment_pending.v1` | Vai para `PENDENTE_PAGAMENTO` |
| `scheduling.appointment.confirmed.v1` | `CONFIRMADO` |
| `scheduling.appointment.expired.v1` | `EXPIRADO` |
| `scheduling.appointment.rescheduled.v1` | Remarcação (com o novo agendamento) |
| `scheduling.appointment.cancelled_by_consumer.v1` / `.cancelled_by_business.v1` | Cancelamentos |
| `scheduling.appointment.professional_changed.v1` | Troca de profissional |
| `scheduling.appointment.checked_in.v1` / `.completed.v1` | Atendimento |
| `scheduling.appointment.no_show.v1` / `.no_show_reverted.v1` | Não comparecimento e correção |

### Eventos de produto e métricas

| Métrica | Origem | Meta |
|---|---|---|
| Atendimentos concluídos (e pagos, com a spec 012) por mês | CONST 7 · DF 14 (North Star) | Acompanhada |
| Tempo da página do estabelecimento à confirmação (mediana) | DF 3.1.2 | Até 3 min |
| % de remarcações feitas pelo consumidor no app ou na web | DF 3.1.6 | Acompanhada |
| % de agendamentos com profissional escolhido | DF 3.1.8 | Acompanhada |
| % de agendamentos com check-in e check-out | DF 3.2.10 | Acompanhada |
| % de agendamentos feitos pelo consumidor (fora do manual) | DF 3.2.13 | Acompanhada |
| Parcela de agendamentos feitos pela web | CONST 7 · D27 | Acompanhada desde o 1º tenant |
| No-show com e sem lembrete | CONST 7 · C1 | Acompanhada desde o 1º tenant (com a spec 011) |
| % de tenants com primeiro agendamento em 7 dias | DF 14 | Acompanhada |
| % de agendamentos expirados no checkout | J1 | Acompanhada |
| Ocupação da agenda por colaborador | DF 3.3.1 · DF 14 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um consumidor com conta agenda da página do estabelecimento à confirmação em até 3 minutos (mediana), no app e na web.
- **SC-002**: 100% dos agendamentos terminam numa tela de confirmação com resumo e próximo passo.
- **SC-003**: Um agendamento confirmado, remarcado ou cancelado aparece no painel, no app do colaborador e em "Meus agendamentos" em até 5 segundos.
- **SC-004**: Nenhuma remarcação deixa o consumidor sem horário ou com dois horários ocupados, em 100% dos testes com falha injetada.
- **SC-005**: Nenhuma sequência de comandos produz transição proibida, em 100% dos testes de propriedade.
- **SC-006**: Nenhum agendamento concluído é excluído em nenhum teste.
- **SC-007**: O Colaborador lê a agenda dos próximos 7 dias sem rede, e 100% dos check-ins e check-outs feitos sem rede chegam ao servidor quando ela volta.
- **SC-008**: A Recepção cria um agendamento manual para um consumidor novo em até 1 minuto.
- **SC-009**: Nenhum tenant vê agendamento de outro tenant, e "Meus agendamentos" do consumidor mostra os de todos os estabelecimentos em que ele agendou.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma.

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **C5** | ASSUMIDO (CONST 8): projeção global `consumer_appointments_index` alimentada por eventos |
| **C1** / **PEN-25** | Os avisos ao consumidor são entregues pela spec 011, que nasce multicanal; esta spec não depende só de push |
| **PEN-15** / **PEN-13** | A exigência de sinal e a multa são das specs 010 e 012; esta spec trata os dois caminhos (com e sem pagamento online) |
| Remarcação | ASSUMIDO: mantém preço, versões congeladas e pagamento do agendamento original |
| Tolerância de não comparecimento | ASSUMIDO: 15 minutos, ajustável pela spec 010 |
| Pré-cadastro pela equipe | ASSUMIDO: permitido com nome e celular, assumido pelo consumidor ao verificar o OTP |
| Limite de agendamentos futuros | ASSUMIDO: 5 por consumidor e estabelecimento pelo app ou pela web |

---

## Fora do escopo desta especificação

- Cálculo de horários livres e proteção contra reserva dupla (spec 008).
- Regras e consequências de cancelamento, remarcação e não comparecimento (spec 010).
- Lembretes, avisos e confirmações por push, e-mail e SMS (spec 011).
- Pagamento, sinal, estorno e cobrança da diferença do preço "a partir de" (spec 012).
- Séries recorrentes (spec 013), fila de espera e horário ocioso (spec 014).
- Pontos de fidelidade (spec 015) e avaliações (spec 016).
- Ficha do consumidor e anotações de atendimento (spec 020).
- Agendamento para dependentes e pets (spec 025).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: J1 em até 3 minutos (mediana) para quem já tem conta; reflexo em até 5 segundos; confirmação em até 2 segundos (p95); check-in a partir de 30 minutos antes; tolerância de 15 minutos; correção de não comparecimento em até 48 horas; agenda offline de 7 dias; até 5 agendamentos futuros por consumidor e estabelecimento; observação de até 300 caracteres.
- Até a spec 010 existir, a política padrão é "cancelamento e remarcação gratuitos até o horário", e nenhum agendamento exige pagamento online.
- A agenda da semana mostra um colaborador por vez; a visão de vários colaboradores fica na agenda do dia.
- O endereço completo do autônomo que atende em casa só aparece na tela de confirmação e nos avisos do agendamento confirmado (REQ-NEG-051).
- O domínio dono desta spec é `scheduling` (CONST 4.4), o mesmo da spec 008.
