# Feature Specification: Motor de agenda e disponibilidade

**Feature Branch**: `008-motor-agenda-disponibilidade`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "008 motor-agenda-disponibilidade — seguir a sequência da constituição (seção 10): slots, lock, cache, resource_id latente. Depende de 006 e 007. Pendência PEN-23 (latente). Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para recurso compartilhado `[PEN-23]`, turmas `[D30]`, combo com troca `[D34]` e colaborador em vários negócios `[D31]`)

**Superfícies afetadas**: app do consumidor e web do consumidor ("Escolha de profissional", "Data e horário") · painel do cliente (consulta de horários livres no "Novo agendamento manual" e nas agendas, telas da spec 009) · app do colaborador e `/pro` (horários livres) · todos os domínios que reservam tempo (specs 009, 013, 014, 026, 030, 034, 035)

**Depende de**: 006 `catalogo` · 007 `equipe-escalas-comissao` (e, por elas, 005)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípio I (integral), Princípios II, VII, VIII, XI, seções 4.1, 4.4, 6, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.1.2, 4.3, 6, 6.1 (invariante 1), 8 (J1), 9.1, 9.8, 10.1, 10.2, 13, 16 e 18 (`[PEN-23]`, `[C2]`, `[C6]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

"Reserva dupla é a falha mais cara do produto, porque quebra a confiança do consumidor e do estabelecimento ao mesmo tempo" (CONST I, DF 10.2). Ela é uma **invariante**, não uma meta.

Este motor responde a duas perguntas, para todos os domínios que mexem em tempo:

1. **Quais horários estão livres?** Para um serviço ou combo, numa filial, com um profissional escolhido ou com "qualquer profissional", num intervalo de datas. A resposta precisa ser rápida (p95 abaixo de 500 ms, CONST 6) e pode estar um pouco desatualizada.
2. **Este horário pode ser ocupado agora?** A resposta precisa ser exata. Consultar disponibilidade não garante nada: a garantia só existe na escrita, com lock e constraint (CONST I).

Os insumos vêm das specs anteriores: horário da filial (005), serviço, combo, duração, preparo e limpeza (006), escala, folgas, bloqueios, serviços e duração por profissional (007).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.2 | Agendar e controlar agendamentos | Tempo até confirmação |
| DF 6.1, invariante 1 | Um colaborador não pode ter dois agendamentos sobrepostos | 0 sobreposições |
| DF 13 | Latência; consistência de agenda | p95 < 500 ms; zero reserva dupla |
| DF 14 | Qualidade | Incidentes de reserva dupla (meta 0) |

Personas: consumidor que escolhe horário; Recepção, Gerente e Proprietário que agendam pelo painel; Colaborador que consulta horários; e, indiretamente, todos os domínios que reservam tempo.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor vê os horários livres de verdade (Priority: P1)

Como consumidor, depois de escolher o serviço, quero escolher o profissional (ou "qualquer profissional") e ver os dias e horários livres, para agendar em poucos toques (J1).

**Why this priority**: é a tela "Data e horário" da J1; sem ela não há agendamento.

**Independent Test**: com uma filial de teste, dois colaboradores com escalas diferentes, uma folga e um agendamento existente, consultar os horários de um serviço de 45 minutos e conferir que só aparecem horários em que o serviço inteiro (com preparo e limpeza) cabe.

**Acceptance Scenarios**:

1. **Given** um serviço e uma filial, **When** o consumidor escolhe um profissional, **Then** vê os próximos dias com horários livres e, para cada dia, os horários de início em que o serviço inteiro cabe dentro do tempo de trabalho do profissional, sem sobrepor nenhuma ocupação.
2. **Given** a opção "qualquer profissional", **When** o consumidor a escolhe, **Then** vê a união dos horários de todos os profissionais que executam o serviço, e o profissional é atribuído na reserva pela regra do estabelecimento.
3. **Given** o preparo e a limpeza do serviço (spec 006), **When** os horários são calculados, **Then** esses tempos também precisam estar livres, mas não aparecem como duração para o consumidor.
4. **Given** um profissional com duração própria para o serviço (spec 007), **When** os horários dele são calculados, **Then** usa a duração própria.
5. **Given** a antecedência mínima e o horizonte do negócio (padrão: 2 horas e 60 dias), **When** os horários são exibidos, **Then** nenhum começa antes da antecedência mínima nem depois do horizonte.
6. **Given** horários exibidos, **When** aparecem na tela, **Then** estão no fuso da filial, agrupados em manhã, tarde e noite; se o fuso do aparelho for diferente, a tela avisa.
7. **Given** nenhum horário livre no período visível, **When** o consumidor consulta, **Then** vê o próximo dia com horário livre e, a partir da spec 014, a opção de entrar na fila de espera.
8. **Given** a consulta de horários, **When** medida, **Then** responde em até 500 ms (p95), inclusive em 3G para o primeiro dia visível.

---

### User Story 2 - Ninguém consegue ocupar o mesmo horário duas vezes (Priority: P1)

Como estabelecimento e como consumidor, quero que, se duas pessoas tentarem o mesmo horário ao mesmo tempo, só uma consiga, e a outra receba alternativas na hora.

**Why this priority**: é a invariante do Princípio I e a invariante 1 do DF 6.1. Não admite exceção (CONST 9.4).

**Independent Test**: disparar N pedidos simultâneos para a mesma janela do mesmo profissional, pela web, pelo app e pelo painel; exatamente 1 é aceito, e os demais recebem "horário acabou de ser ocupado" com alternativas.

**Acceptance Scenarios**:

1. **Given** N pedidos simultâneos para a mesma janela do mesmo profissional, **When** processados, **Then** exatamente 1 é aceito e N − 1 são recusados.
2. **Given** um pedido recusado por conflito, **When** a resposta chega, **Then** traz os 3 horários livres mais próximos do mesmo profissional e, se houver, o mesmo horário com outro profissional.
3. **Given** a proteção da escrita, **When** o lock falhar ou expirar no meio da operação, **Then** a regra do banco ainda impede a sobreposição; lock sem regra no banco, ou regra no banco sem lock, não basta.
4. **Given** um horário mostrado como livre mas ocupado logo depois, **When** o consumidor tenta reservá-lo, **Then** a reserva é recusada na escrita; o que estava na tela nunca vale como garantia.
5. **Given** uma ocupação que envolve um recurso (quando existir, `[PEN-23]`), **When** reservada, **Then** a proteção vale também para o par recurso e janela.

---

### User Story 3 - Segurar o horário enquanto o consumidor paga (Priority: P1)

Como consumidor, quero que o horário escolhido fique segurado por alguns minutos enquanto completo o cadastro e o pagamento, sem que outra pessoa o tire de mim.

**Why this priority**: entre escolher o horário e pagar (J1: etapa 2 do cadastro, meio de pagamento, sinal) há minutos; sem reserva temporária, a taxa de "horário perdido no checkout" seria alta.

**Independent Test**: escolher um horário, verificar que ele some para outro consumidor, deixar a reserva temporária expirar sem pagar e verificar que ele volta a aparecer.

**Acceptance Scenarios**:

1. **Given** um horário escolhido, **When** o consumidor avança no fluxo, **Then** o horário fica segurado por 10 minutos e some da lista dos demais.
2. **Given** um pagamento em andamento (spec 012), **When** o domínio de agendamento pede, **Then** a reserva temporária pode ser estendida uma vez, até 30 minutos no total.
3. **Given** uma reserva temporária que vence sem confirmação, **When** o prazo acaba, **Then** o horário volta a ficar livre em até 1 minuto, e um evento é publicado.
4. **Given** um mesmo consumidor, **When** tenta segurar mais de 2 horários ao mesmo tempo no mesmo negócio, **Then** o terceiro pedido é recusado (proteção contra agendamento em massa, CONST 5).
5. **Given** a confirmação do agendamento (spec 009), **When** acontece dentro do prazo, **Then** a reserva temporária vira ocupação definitiva, sem janela em que outro pedido possa entrar.

---

### User Story 4 - Combo reservado de uma vez (Priority: P1)

Como consumidor, quero agendar um combo (por exemplo, corte + barba) e ter certeza de que todas as etapas ficam reservadas em sequência com o mesmo profissional, ou nenhuma.

**Why this priority**: CONST I exige reserva atômica do combo; combo está na fatia zero (DF 15).

**Independent Test**: consultar horários de um combo de duas etapas; reservar; simular falha na segunda etapa e verificar que a primeira também não fica ocupada.

**Acceptance Scenarios**:

1. **Given** um combo (spec 006), **When** os horários são calculados, **Then** só aparecem inícios em que todas as etapas, com intervalos, preparo e limpeza, cabem em sequência com o mesmo profissional, e só profissionais que executam todas as etapas.
2. **Given** a reserva de um combo, **When** qualquer etapa não puder ser ocupada, **Then** nenhuma etapa fica ocupada.
3. **Given** um combo reservado, **When** consultado, **Then** cada etapa aparece como ocupação própria, ligada às demais pelo mesmo agendamento.

---

### User Story 5 - Equipe agenda pelo painel, com encaixe controlado (Priority: P2)

Como Recepção, Gerente ou Proprietário, quero ver os horários livres de cada profissional e, quando necessário, agendar fora da escala com confirmação explícita, mas nunca por cima de outro atendimento.

**Why this priority**: o agendamento manual (DF 9.3, "Novo agendamento manual") é parte da rotina; a regra contra sobreposição vale também para a equipe.

**Independent Test**: pelo painel, tentar agendar fora da escala (aceito com confirmação) e por cima de outro agendamento (recusado sempre).

**Acceptance Scenarios**:

1. **Given** a equipe no painel, **When** consulta horários, **Then** vê os mesmos horários livres do consumidor, sem a antecedência mínima, e com os serviços só de agendamento interno.
2. **Given** um horário fora da escala do profissional ou fora do horário da filial, **When** a equipe tenta agendar, **Then** é possível com confirmação explícita "fora do horário", registrada com ator e motivo.
3. **Given** um horário sobreposto a outra ocupação do mesmo profissional, **When** qualquer pessoa tenta agendar, **Then** é recusado, sem opção de forçar.
4. **Given** um horário dentro de uma folga ou bloqueio aprovado (spec 007), **When** a equipe tenta agendar, **Then** é recusado; para usar o horário, a folga ou o bloqueio precisa ser removido antes.

---

### User Story 6 - Horários sempre coerentes com a realidade (Priority: P2)

Como estabelecimento, quero que qualquer mudança (agendamento novo, cancelamento, escala, folga, horário da filial, duração de serviço) se reflita nos horários mostrados ao consumidor em segundos.

**Why this priority**: horário mostrado e depois recusado na escrita frustra o consumidor; o cache precisa ser rápido e quase sempre certo.

**Independent Test**: com o consumidor vendo a lista de horários, cancelar um agendamento no painel e ver o horário aparecer; aprovar uma folga e ver os horários sumirem.

**Acceptance Scenarios**:

1. **Given** uma mudança em qualquer insumo (ocupação, escala, folga, bloqueio, horário da filial, catálogo), **When** ela acontece, **Then** os horários exibidos refletem a mudança em até 5 segundos (p95).
2. **Given** uma falha na atualização dos horários guardados, **When** isso acontece, **Then** a consulta calcula a partir dos dados de origem, mais devagar, mas nunca mostra horário de profissional em folga.
3. **Given** a taxa de recusa na escrita por conflito com horário mostrado como livre, **When** medida, **Then** fica abaixo de 2% das tentativas de reserva.

---

### User Story 7 - Recurso compartilhado latente e conflito entre negócios detectável (Priority: P3)

Como responsável pelo produto, quero que o motor já aceite um recurso opcional (sala, cadeira, equipamento) e já consiga detectar conflito do mesmo profissional entre negócios, sem interface, para que `[PEN-23]` e `[D31]` não exijam reescrever o motor.

**Why this priority**: CONST 8 (`[C2]`) exige `resource_id` opcional desde a v1.0; CONST I (`[C6]`) exige detecção de conflito entre negócios assim que existir colaborador em vários negócios.

**Independent Test**: em teste de contrato, reservar duas ocupações de profissionais diferentes com o mesmo recurso na mesma janela: a segunda é recusada. Em teste de contrato, criar ocupações da mesma pessoa em dois tenants sintéticos e verificar que a sobreposição é detectada e informada.

**Acceptance Scenarios**:

1. **Given** uma ocupação com recurso informado, **When** outra ocupação pede o mesmo recurso na mesma janela, **Then** é recusada pela mesma regra de proteção dos profissionais.
2. **Given** uma ocupação sem recurso, **When** reservada, **Then** funciona exatamente como hoje; na v1.0 nenhuma tela informa recurso.
3. **Given** a mesma pessoa com ocupações sobrepostas em dois tenants (fase 2), **When** a segunda é criada, **Then** é aceita (sem bloqueio automático, salvo se o colaborador tiver ligado o bloqueio da spec 027), e um aviso de conflito é publicado para o colaborador e para os dois tenants; nenhuma spec pode dizer que esse conflito está "resolvido" enquanto `[C6]` estiver aberto.

---

### Edge Cases

- **Horário de verão ou mudança de fuso**: a grade de inícios é gerada em hora local da filial para cada data; um início que não existe (pulo de hora) não é oferecido, e um início ambíguo (hora repetida) é oferecido uma vez só.
- **Serviço mais longo que qualquer intervalo de trabalho**: não aparece horário; o painel avisa o Proprietário.
- **Escala que muda no meio do período consultado** (vigência futura, spec 007): cada data usa a escala vigente naquela data.
- **Agendamento que atravessa o fim do expediente por causa da limpeza**: a limpeza precisa caber no tempo de trabalho, salvo encaixe "fora do horário" feito pela equipe.
- **"Qualquer profissional" e todos ocupados no horário**: o horário não aparece.
- **Reserva temporária expirada exatamente no momento da confirmação**: vale a ordem da escrita; se a ocupação já foi liberada e tomada, a confirmação é recusada com alternativas.
- **Relógio do aparelho errado**: a antecedência mínima e a validade da reserva temporária usam o horário do servidor.
- **Filial pausada ou negócio despublicado** (spec 005): nenhum horário é oferecido ao consumidor; a equipe ainda pode agendar com aviso.
- **Tenant suspenso** (spec 002): nenhum horário é oferecido e nenhuma ocupação nova é aceita.
- **Profissional sem conta no app** (spec 007): é agendável normalmente.
- **Volume de pico** (por exemplo, abertura de agenda de fim de ano): a consulta continua dentro da meta para 50 consultas por segundo por filial.

---

## Requirements *(mandatory)*

Formato: `REQ-AGD-NNN (origem: …)`.

### Functional Requirements

**Cálculo de horários livres**

- **REQ-AGD-001** (origem: DF 4.3 | DF 8 J1): O motor DEVE calcular, para um serviço ou combo, uma filial, um profissional (ou "qualquer profissional") e um intervalo de datas, os horários de início em que o atendimento inteiro cabe, considerando: horário da filial (005), escala, exceções, folgas e bloqueios (007, REQ-EQP-023), duração própria do profissional (007), preparo, limpeza e intervalos de combo (006), e todas as ocupações existentes.
- **REQ-AGD-002** (origem: DF 4.3): Os horários de início DEVEM seguir a grade do negócio (padrão: a cada 15 minutos; opções 5, 10, 15, 20, 30 e 60), alinhada ao início de cada intervalo de trabalho.
- **REQ-AGD-003** (origem: DF 3.1.2): O negócio DEVE configurar antecedência mínima (padrão 2 horas; de 0 a 72 horas) e horizonte máximo (padrão 60 dias; de 7 a 365 dias) para o consumidor; a equipe não está sujeita à antecedência mínima.
- **REQ-AGD-004** (origem: DF 8 J1 "Escolha de profissional"): Na opção "qualquer profissional", o resultado DEVE ser a união dos horários dos profissionais que executam o serviço; na reserva, o profissional é atribuído pela regra do negócio (padrão: o menos ocupado no dia; empate decidido de forma estável).
- **REQ-AGD-005** (origem: DF 8 J1): O negócio DEVE poder desligar a escolha de profissional pelo consumidor (padrão: ligada); desligada, o consumidor vê só "qualquer profissional".
- **REQ-AGD-006** (origem: CONST XI): Os cálculos DEVEM ser feitos em hora local da filial por data e guardados em UTC; a exibição usa o fuso da filial, com aviso quando o do aparelho for diferente.
- **REQ-AGD-007** (origem: CONST 6 | DF 13): A consulta de horários DEVE responder em até 500 ms (p95), com até 50 consultas por segundo por filial.
- **REQ-AGD-008** (origem: DF 8 J1): Sem horário no período visível, a consulta DEVE informar o próximo dia com horário livre dentro do horizonte.
- **REQ-AGD-009** (origem: REQ-NEG-053 | REQ-TEN-045): Filial pausada, negócio despublicado ou tenant fora do estado ativo NÃO DEVEM ter horários oferecidos ao consumidor.

**Proteção contra reserva dupla**

- **REQ-AGD-020** (origem: CONST I | DF 10.2): Toda criação ou alteração de ocupação DEVE adquirir um lock distribuído sobre `(profissional, janela)` e, quando houver, `(recurso, janela)`, com prazo de validade e marca de posse.
- **REQ-AGD-021** (origem: CONST I | DF 10.2): O banco DEVE ter uma regra (constraint ou mecanismo transacional equivalente) que impeça duas ocupações sobrepostas do mesmo profissional, e do mesmo recurso, como última linha de defesa.
- **REQ-AGD-022** (origem: CONST I): A consulta de horários NÃO DEVE ser tratada como garantia; a confirmação acontece só na escrita.
- **REQ-AGD-023** (origem: CONST I | DF 6.1 inv. 1): A janela protegida de uma ocupação DEVE incluir preparo e limpeza.
- **REQ-AGD-024** (origem: CONST I | D19): A reserva de combo DEVE ser atômica: todas as etapas ou nenhuma.
- **REQ-AGD-025** (origem: CONST I): Toda recusa por conflito DEVE devolver alternativas: os 3 horários livres mais próximos do mesmo profissional e, se houver, o mesmo horário com outro profissional que execute o serviço.
- **REQ-AGD-026** (origem: CONST I): A proteção DEVE valer para toda origem de ocupação: consumidor (app e web), equipe (painel e app do colaborador), série recorrente (spec 013), fila de espera e horário ocioso (spec 014), turmas (spec 026), combo com troca (spec 030), aulas recorrentes (spec 034) e pré-reserva de evento (spec 035).

**Ocupações e reserva temporária**

- **REQ-AGD-030** (origem: DF 6 | DF 10.1): O motor DEVE manter as ocupações de tempo (profissional, filial, janela, recurso opcional, origem, agendamento ou etapa a que pertence, tipo: temporária ou definitiva).
- **REQ-AGD-031** (origem: DF 8 J1): Uma reserva temporária DEVE durar 10 minutos e poder ser estendida uma vez, a pedido do domínio de agendamento, até 30 minutos no total.
- **REQ-AGD-032** (origem: DF 8 J1): A reserva temporária vencida DEVE ser liberada em até 1 minuto, com evento publicado.
- **REQ-AGD-033** (origem: CONST 5 antifraude): Um mesmo consumidor NÃO DEVE ter mais de 2 reservas temporárias ativas no mesmo negócio.
- **REQ-AGD-034** (origem: CONST I): A conversão de reserva temporária em definitiva DEVE acontecer sem intervalo em que outra escrita possa ocupar a janela.
- **REQ-AGD-035** (origem: CONST I): Liberar uma ocupação definitiva (cancelamento, remarcação) é comando do domínio de agendamento (spec 009); o motor DEVE liberar a janela e publicar evento.

**Agendamento pela equipe**

- **REQ-AGD-040** (origem: DF 9.3 "Novo agendamento manual"): A equipe DEVE ver os horários livres sem a antecedência mínima e com serviços só de agendamento interno.
- **REQ-AGD-041** (origem: DF 9.3): A equipe DEVE poder ocupar horário fora da escala ou do horário da filial com confirmação explícita e motivo, registrados com ator.
- **REQ-AGD-042** (origem: CONST I): Ninguém, de nenhum perfil, DEVE poder ocupar horário sobreposto a outra ocupação do mesmo profissional ou recurso.
- **REQ-AGD-043** (origem: REQ-EQP-032): Horário dentro de folga ou bloqueio aprovado NÃO DEVE ser ocupado; é preciso remover a folga ou o bloqueio antes.

**Horários guardados (cache) e atualização**

- **REQ-AGD-050** (origem: CONST 4.1): O motor DEVE guardar horários calculados para responder rápido, e invalidar o que mudou a cada evento de ocupação, escala, folga, bloqueio, troca, horário da filial e catálogo.
- **REQ-AGD-051** (origem: CONST I): Mudanças DEVEM aparecer nos horários exibidos em até 5 segundos (p95).
- **REQ-AGD-052** (origem: CONST I): Se os horários guardados estiverem indisponíveis, a consulta DEVE calcular a partir dos dados de origem; NUNCA mostrar horário dentro de folga, bloqueio ou ocupação conhecida.
- **REQ-AGD-053** (origem: CONST II): Horários guardados, locks e filas DEVEM levar o tenant como prefixo (REQ-TEN-043).

**Modelo preparado para as fases seguintes**

- **REQ-AGD-060** (origem: C2 | PEN-23 | CONST 8): Ocupação e proteção DEVEM aceitar `resource_id` opcional desde a v1.0, sem interface; sem recurso, o comportamento é o descrito acima.
- **REQ-AGD-061** (origem: C6 | D31 | CONST I): O motor DEVE detectar sobreposição de ocupações da mesma pessoa em tenants diferentes e publicar aviso ao colaborador e aos dois tenants, sem bloquear por padrão; o bloqueio entre negócios só existe quando o próprio colaborador o liga (`[C6]` decidido em 2026-11-25, CONST 1.1.0; implementado na spec 027). Na v1.0, como a pessoa tem vínculo em um único tenant, a detecção existe e é testada por contrato.
- **REQ-AGD-062** (origem: D30 | D34 | D42 | CONST 2): O modelo de ocupação DEVE aceitar, sem migração destrutiva: capacidade N por janela (turma), etapas com profissionais diferentes (combo com troca) e ocupação por dia ou período (evento).

**Contratos e testes**

- **REQ-AGD-070** (origem: CONST VII): O motor DEVE publicar contratos de: consulta de horários (consumidor e equipe), reserva temporária, extensão, confirmação, liberação e consulta de ocupações por profissional e período; e eventos de ocupação.
- **REQ-AGD-071** (origem: CONST I | CONST VIII): O CI DEVE ter teste de concorrência em que N pedidos simultâneos para a mesma janela produzem exatamente 1 sucesso, para serviço, combo e recurso, como portão de merge.
- **REQ-AGD-072** (origem: CONST VIII): O CI DEVE ter testes de propriedade do cálculo de horários (nenhum horário oferecido sobrepõe ocupação, folga ou bloqueio; todo horário oferecido cabe inteiro no tempo de trabalho), incluindo fusos e horário de verão.
- **REQ-AGD-073** (origem: CONST II | REQ-TEN-044): Os contratos desta spec DEVEM entrar na suíte de isolamento de tenant.

### Key Entities

- **Ocupação** (`time_slot` ocupado): tenant, filial, profissional, recurso opcional, janela protegida (início e fim com preparo e limpeza), janela exibida, tipo (temporária ou definitiva), origem, agendamento e etapa, validade (se temporária), quem criou, "fora do horário" (sim ou não, com motivo).
- **Configuração de agenda do negócio**: grade de inícios, antecedência mínima, horizonte, escolha de profissional pelo consumidor, regra de atribuição em "qualquer profissional".
- **Horários guardados**: filial, profissional, serviço, data, inícios livres, versão dos insumos.
- **Aviso de conflito entre negócios** (fase 2): pessoa, tenants, ocupações envolvidas, data.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Escolha de profissional · Data e horário | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Escolha de profissional · Data e horário | `W..` registrados no plano |
| Painel (DF 9.3) | Seleção de horário dentro de "Novo agendamento manual" (a tela é da spec 009) | Registrado no plano |
| Painel | Configurações de agenda (grade, antecedência, horizonte, escolha de profissional) dentro de "Configurações, link e QR" | Registrado no plano |

---

## Regras e estados

- **Ocupação temporária**: `ativa` → `convertida` (vira definitiva) | `expirada` | `liberada` (desistência).
- **Ocupação definitiva**: `ativa` → `liberada` (cancelamento ou remarcação, por comando da spec 009). A ocupação de agendamento concluído nunca é apagada (CONST I).
- **Janela protegida** = preparo + duração (ou etapas e intervalos do combo) + limpeza.
- **Horário livre** = tempo de trabalho (escala ∩ filial − folgas − bloqueios) − janelas protegidas de todas as ocupações ativas, respeitando grade, antecedência e horizonte.
- **Ordem de decisão** em empate de escrita: a primeira escrita confirmada vence; as demais recebem alternativas.

---

## Dados pessoais

| Item | Definição |
|---|---|
| **Campos de pessoa** | A ocupação guarda o identificador do consumidor (quando houver) e do profissional, nunca nome, telefone ou e-mail |
| **Reserva temporária** | Guarda o identificador do consumidor só para aplicar o limite de 2 reservas; descartada ao expirar ou converter |
| **Horários guardados** | Não contêm dado pessoal: só filial, profissional, serviço e horários |
| **Consulta pública de horários** | Mostra apenas que um horário está livre, nunca quem ocupa |
| **Base legal** | Execução de contrato (LGPD art. 7, V) |
| **Retenção** | Ocupações seguem o agendamento a que pertencem (spec 009); reservas temporárias expiradas são apagadas em 24 horas |
| **Quem acessa** | Equipe do tenant conforme papel; consumidor só as próprias |

---

## Permissões

Recorte da matriz RBAC (DF 7, "Agendar" e "Ver agenda"):

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte |
|---|---|---|---|---|---|---|
| Consultar horários livres (visão consumidor) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* |
| Consultar horários livres (visão equipe, com só interno) | — | ✔ própria | ✔ filial | ✔ filial | ✔ rede | ✔* |
| Ocupar horário (pelos fluxos da spec 009) | ✔ | ✔ própria | ✔ | ✔ | ✔ | ✔* |
| Ocupar fora do horário, com confirmação | — | — | ✔ | ✔ | ✔ | ✔* |
| Alterar configurações de agenda do negócio | — | — | — | — | ✔ | — |

`✔*` = apenas em sessão de suporte (spec 003). A regra contra sobreposição vale para todos, sem exceção.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `scheduling.hold.created.v1` / `.extended.v1` / `.expired.v1` / `.released.v1` / `.converted.v1` | Ciclo da reserva temporária |
| `scheduling.occupation.created.v1` / `.released.v1` | Ocupação definitiva criada ou liberada |
| `scheduling.occupation.conflict_rejected.v1` | Escrita recusada por conflito (sem dado pessoal) |
| `scheduling.occupation.cross_tenant_overlap_detected.v1` | Sobreposição da mesma pessoa entre tenants (fase 2) |
| `scheduling.availability.invalidated.v1` | Horários guardados invalidados (uso interno) |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Incidentes de reserva dupla em produção | CONST I · DF 14 | 0 |
| Latência da consulta de horários (p95) | CONST 6 | Abaixo de 500 ms |
| Tempo de reflexo de mudanças nos horários (p95) | REQ-AGD-051 | Até 5 s |
| % de reservas recusadas na escrita por conflito com horário exibido | REQ-AGD-022 | Abaixo de 2% |
| % de reservas temporárias que expiram sem confirmação | DF 3.1.2 | Acompanhada |
| Ocupações "fora do horário" por filial | REQ-AGD-041 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das execuções do teste de concorrência, N pedidos simultâneos para a mesma janela produzem exatamente 1 reserva, para serviço avulso, combo e recurso.
- **SC-002**: Zero incidentes de reserva dupla em produção.
- **SC-003**: O consumidor vê os horários livres de um serviço em até meio segundo em 95% das consultas.
- **SC-004**: Um cancelamento ou uma folga aparece nos horários exibidos em até 5 segundos em 95% dos casos.
- **SC-005**: Menos de 2% das tentativas de reserva são recusadas por um horário que a tela mostrava como livre.
- **SC-006**: Nenhum horário oferecido cai dentro de folga, bloqueio, fora do tempo de trabalho ou numa hora inexistente por horário de verão, em 100% dos testes de propriedade.
- **SC-007**: Uma reserva temporária não confirmada devolve o horário em até 11 minutos depois da escolha (10 de validade + 1 de liberação).
- **SC-008**: Nenhum combo fica com parte das etapas reservadas, em 100% dos testes com falha injetada.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma. As pendências desta spec são latentes e têm padrão definido pela constituição.

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **PEN-23** / **C2** | ASSUMIDO (CONST 8): `resource_id` opcional na ocupação e na proteção desde a v1.0, sem interface |
| **C6** / **D31** | Decidido (2026-11-25, CONST 1.1.0): detecção e aviso obrigatórios; bloqueio entre negócios só quando o colaborador o liga (spec 027) |
| **PEN-15** / **PEN-13** | Não afetam o motor; a extensão da reserva temporária durante o pagamento atende qualquer decisão de sinal |
| **PEN-12** | A materialização de ocorrências de série (spec 013) usa os mesmos contratos de ocupação |
| Valores padrão | ASSUMIDO: grade de 15 min, antecedência de 2 h, horizonte de 60 dias, reserva temporária de 10 min (máximo 30), limite de 2 reservas por consumidor, atribuição "menos ocupado" |

---

## Fora do escopo desta especificação

- Ciclo de vida do agendamento, confirmação, remarcação e cancelamento (spec 009); este motor só ocupa e libera tempo por comando.
- Agenda do dia e da semana no painel e no app do colaborador, inclusive a leitura offline (spec 009).
- Política de cancelamento e no-show (spec 010).
- Materialização de séries recorrentes (spec 013) e oferta de horário ocioso e fila de espera (spec 014).
- Interface de recurso compartilhado (`[PEN-23]`, adiado).
- Turmas, combo com troca de profissional e colaborador em vários negócios com agenda unificada (specs 026, 030 e 027).
- Deslocamento entre endereços e rota do dia (spec 033).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: reflexo de mudanças em até 5 s; recusa na escrita abaixo de 2%; 50 consultas por segundo por filial; reserva temporária de 10 minutos, estendível até 30; liberação em até 1 minuto; limite de 2 reservas temporárias por consumidor e negócio.
- A atribuição em "qualquer profissional" usa o menos ocupado do dia; outras regras (rodízio, preferência) podem ser acrescentadas depois como opção do negócio.
- As filiais têm um único fuso cada (spec 005).
- O cálculo considera só profissionais com vínculo ativo, pelo menos um serviço e escala vigente (spec 007).
- O motor pertence ao domínio `scheduling` (CONST 4.4), o mesmo da spec 009.
