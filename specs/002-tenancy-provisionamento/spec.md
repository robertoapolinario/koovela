# Feature Specification: Tenancy e provisionamento de schema

**Feature Branch**: `002-tenancy-provisionamento`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "Spec 002 da sequência da constituição (seção 10): `tenancy-provisionamento` — schema por tenant e executor de migração multi-schema. Depende de 001. Seguir especificando todas as specs em ordem e sinalizar quando for preciso `/speckit-clarify`."

**Fase**: v1.0

**Superfícies afetadas**: back-office (tela "Provisionamento e migração de schema", DF 9.5). As demais superfícies não mudam, mas todo serviço passa a obter a conexão de banco pelo mecanismo desta spec.

**Depende de**: 001 `fundacao-plataforma`

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, VIII, X e XII, seções 4.1, 4.4, 6, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.5, 3.4.8, 4.1, 6, 6.1, 7, 9.5, 11, 13 e 18.2. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A Koovela isola cada tenant em um schema próprio de banco `[D06]`. Isso protege os dados de um estabelecimento contra os de outro, mas multiplica o trabalho de operação: cada tenant novo precisa de um schema pronto, e cada mudança de estrutura precisa chegar a todos os schemas sem derrubar o serviço. Com um desenvolvedor e dois hosts, fazer isso à mão é inviável (`[C3]`).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.4.8 | Provisionar e migrar schema por tenant | Tempo de provisionamento; falhas de migração |
| 3.4.1 | Gestão técnica dos tenants | Cobertura de observabilidade |
| Invariante 3 (DF 6.1) | Nenhuma consulta retorna dado de outro tenant | Suíte de isolamento verde |

Riscos que esta spec contém: `[C3]` (migração em N tenants × M domínios), vazamento de dado entre tenants (DF 16), e schema de tenant em versão divergente das demais sem que ninguém perceba.

Personas: Engenharia/SRE (DF 2.5), que provisiona e migra; desenvolvedor, que escreve migrações e consome a conexão por tenant; e, indiretamente, todo tenant, cujo dado depende do isolamento.

---

## Clarifications

### Session 2026-11-25

- Q: No banco, cada tenant tem um schema só compartilhado por todos os domínios, ou um schema por tenant e por domínio? → A: Um schema por tenant, compartilhado pelos domínios; cada domínio é dono das próprias tabelas e usa credencial com permissão só nelas (reduz o `[C3]`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Provisionar um tenant novo em menos de 2 minutos (Priority: P1)

Como SRE (e, a partir da spec 005, como fluxo de onboarding), quero criar o espaço de dados de um tenant novo com um comando, de forma idempotente, para que ele esteja pronto para uso em menos de 2 minutos.

**Why this priority**: sem provisionamento não existe tenant, e nenhuma spec de negócio pode começar. É a meta de NFR da CONST 6.

**Independent Test**: pedir o provisionamento de um tenant de teste e medir o tempo até o estado `ativo`; repetir o mesmo pedido e verificar que nada é duplicado.

**Acceptance Scenarios**:

1. **Given** um pedido de provisionamento com identificador de tenant novo, **When** o provisionamento roda, **Then** o espaço de dados do tenant é criado com todas as estruturas de todos os domínios na versão atual, as credenciais de acesso por domínio são concedidas, e o tenant chega ao estado `ativo` em menos de 2 minutos.
2. **Given** um pedido de provisionamento repetido para o mesmo tenant (mesma chave de idempotência), **When** ele roda, **Then** o resultado é o mesmo do primeiro pedido, sem erro e sem duplicação.
3. **Given** um provisionamento que falha no meio (por exemplo, queda do banco), **When** o SRE pede de novo, **Then** o provisionamento continua de onde parou ou recomeça do zero com limpeza, e termina `ativo`.
4. **Given** um provisionamento concluído, **When** ele termina, **Then** um evento de tenant provisionado é publicado e o registro do tenant mostra a versão de estrutura de cada domínio.
5. **Given** um provisionamento que falha 3 vezes seguidas, **When** a terceira falha ocorre, **Then** o tenant fica em `falha_provisionamento`, nenhum serviço o aceita, e um alerta é emitido.

---

### User Story 2 - Migrar todos os schemas sem indisponibilidade (Priority: P1)

Como desenvolvedor, quero escrever uma migração uma única vez e que o executor a aplique em todos os schemas de tenant e nos schemas globais, sem indisponibilidade, com falha isolada por tenant e reprocessamento.

**Why this priority**: é o coração de `[C3]`. Sem um executor único, cada release viraria uma operação manual em centenas de schemas.

**Independent Test**: com 50 tenants sintéticos em staging, aplicar uma migração de teste enquanto um gerador de carga faz leituras e escritas; nenhuma requisição falha, e um tenant forçado a falhar não impede os demais.

**Acceptance Scenarios**:

1. **Given** uma migração nova de um domínio, **When** o executor roda, **Then** ela é aplicada em todos os schemas de tenant ativos e o registro de cada tenant passa a mostrar a nova versão daquele domínio.
2. **Given** a migração aplicada sob carga, **When** a execução termina, **Then** nenhuma requisição falhou por causa dela (padrão expandir → migrar → contrair).
3. **Given** um tenant em que a migração falha, **When** o executor continua, **Then** os demais tenants recebem a migração, o tenant com falha fica marcado como `migração_pendente` com o erro registrado, e um alerta é emitido.
4. **Given** tenants marcados `migração_pendente`, **When** o SRE pede o reprocessamento, **Then** só esses tenants são reprocessados, e a migração é idempotente (aplicar duas vezes não muda o resultado).
5. **Given** uma migração aplicada, **When** o SRE pede rollback dela, **Then** o executor reverte em todos os tenants em que ela foi aplicada, na ordem inversa, com o mesmo isolamento de falhas.
6. **Given** uma execução em andamento, **When** outra execução é iniciada, **Then** a segunda é recusada até a primeira terminar.
7. **Given** um release novo, **When** o deploy começa, **Then** a migração roda primeiro num grupo pequeno de tenants (canário) e só segue para os demais se o canário terminar sem falha.

---

### User Story 3 - Isolamento de tenant por construção (Priority: P1)

Como desenvolvedor, quero que o código de domínio só consiga falar com o espaço de dados do tenant do contexto atual, para que seja impossível, e não apenas proibido, ler dado de outro tenant.

**Why this priority**: invariante 3 do DF e Princípio II, que não admite exceção (CONST 9.4).

**Independent Test**: executar a suíte de isolamento com dois tenants sintéticos A e B; toda tentativa, a partir do contexto de A, de alcançar dado de B falha.

**Acceptance Scenarios**:

1. **Given** uma requisição ou mensagem com contexto do tenant A, **When** o código de domínio pede uma conexão, **Then** recebe acesso apenas ao espaço de dados de A.
2. **Given** código de domínio que tenta montar uma conexão à mão ou consultar o espaço de dados de outro tenant, **When** o lint e os testes rodam, **Then** o PR falha.
3. **Given** um pedido de conexão sem contexto de tenant, para um recurso que exige tenant, **When** ele é feito, **Then** é recusado com erro explícito, nunca resolvido para um tenant padrão.
4. **Given** um tenant em estado `suspenso`, `arquivado` ou `falha_provisionamento`, **When** chega uma requisição de aplicação para ele, **Then** é recusada com o erro definido para cada estado.
5. **Given** a suíte de isolamento, **When** roda no CI com os tenants A e B, **Then** recursos de B buscados a partir do contexto de A retornam "não encontrado" (404), não "proibido" (403).
6. **Given** cache, chaves de lock, filas e objetos de armazenamento criados por qualquer domínio, **When** inspecionados, **Then** todos carregam o tenant como prefixo ou campo.

---

### User Story 4 - Acompanhar tenants e migrações no back-office (Priority: P2)

Como SRE, quero ver na tela "Provisionamento e migração de schema" o estado de cada tenant, a versão de cada domínio, as falhas e o andamento das execuções, e disparar provisionamento, reprocessamento e rollback dali.

**Why this priority**: a CONST 10 proíbe spec "só backend". A tela é o que torna as histórias 1 e 2 operáveis sem acesso direto ao banco.

**Independent Test**: com tenants sintéticos em vários estados, abrir a tela no back-office e conferir que os números batem com o registro; disparar um reprocessamento pela tela.

**Acceptance Scenarios**:

1. **Given** o back-office aberto, com autenticação de borda e MFA (spec 001), **When** o SRE abre a tela, **Then** vê a lista de tenants com estado, versão de cada domínio, data do último provisionamento ou migração e falhas pendentes, com filtro por estado e por versão.
2. **Given** uma execução de migração em andamento, **When** o SRE acompanha, **Then** vê quantos tenants já foram migrados, quantos faltam, quantos falharam e o tempo estimado.
3. **Given** um tenant com `migração_pendente`, **When** o SRE abre o detalhe, **Then** vê o erro registrado (sem nenhum dado de negócio do tenant) e pode pedir o reprocessamento.
4. **Given** uma ação disparada pela tela (provisionar, reprocessar, reverter, suspender, reativar), **When** ela é confirmada, **Then** exige justificativa e fica registrada com ator, ação, alvo e horário.

---

### User Story 5 - Ciclo de vida do tenant (Priority: P2)

Como SRE, quero que o tenant tenha estados explícitos (provisionando, ativo, suspenso, arquivado, falha de provisionamento, migração pendente) com transições controladas, para que outras specs (assinatura, onboarding, privacidade) possam suspender ou arquivar um tenant sem tocar diretamente no banco.

**Why this priority**: assinatura (019), back-office (021) e privacidade (022) dependem desses estados; definir agora evita migração depois.

**Independent Test**: conduzir um tenant sintético por todas as transições permitidas e verificar que as proibidas são recusadas.

**Acceptance Scenarios**:

1. **Given** um tenant `ativo`, **When** um comando de suspensão chega com motivo, **Then** ele passa a `suspenso`, as requisições de aplicação para ele são recusadas com erro de "conta suspensa", e um evento é publicado.
2. **Given** um tenant `suspenso`, **When** um comando de reativação chega, **Then** ele volta a `ativo` sem perda de dados.
3. **Given** um tenant `suspenso`, **When** um comando de arquivamento chega, **Then** ele passa a `arquivado`, o espaço de dados fica somente leitura para a plataforma e continua incluído em backup e em migração.
4. **Given** qualquer transição não listada como permitida (por exemplo, `arquivado` → `ativo` sem passar por reativação explícita, ou exclusão do espaço de dados), **When** é pedida, **Then** é recusada.
5. **Given** qualquer transição, **When** ocorre, **Then** fica registrado quem fez, quando, de qual estado, para qual estado e por quê.

---

### User Story 6 - Espaços de dados globais (Priority: P2)

Como desenvolvedor, quero que os espaços de dados globais (identidade, plataforma e projeções entre tenants) sejam criados e migrados pelo mesmo executor, para que a identidade global da spec 003 e o índice "Meus agendamentos" (`[C5]`) não tenham um processo próprio.

**Why this priority**: `[C5]` exige identidade e projeções fora dos schemas de tenant; um segundo executor violaria o Princípio XII.

**Independent Test**: criar um ambiente do zero e verificar que os espaços globais existem, estão versionados e recebem migração pelo mesmo comando.

**Acceptance Scenarios**:

1. **Given** um ambiente vazio, **When** o executor roda, **Then** cria os espaços globais `koovela_identity`, `koovela_platform` e o de projeções, na versão atual, antes de qualquer tenant.
2. **Given** uma migração de um espaço global, **When** o executor roda, **Then** é aplicada uma única vez, com o mesmo registro de versão e o mesmo rollback dos tenants.
3. **Given** código de domínio, **When** acessa um espaço global, **Then** só o domínio dono daquele espaço tem permissão de escrita.

---

### User Story 7 - Restaurar um único tenant (Priority: P3)

Como SRE, quero restaurar o espaço de dados de um único tenant a partir do backup, num espaço separado, sem afetar os demais, para atender a um incidente localizado (por exemplo, exclusão acidental feita pelo próprio estabelecimento).

**Why this priority**: o backup da spec 001 é do banco inteiro; restaurar tudo por causa de um tenant derrubaria os outros 499.

**Independent Test**: em staging, apagar dados de um tenant sintético e restaurá-los a partir do backup num espaço separado, conferindo os dados, sem que os outros tenants percebam.

**Acceptance Scenarios**:

1. **Given** um backup íntegro, **When** o SRE pede a restauração do tenant X para um instante escolhido, **Then** o espaço de dados de X é recriado num espaço separado, sem tocar no espaço em uso nem nos de outros tenants.
2. **Given** a restauração concluída, **When** o SRE confere e aprova, **Then** a troca do espaço em uso pelo restaurado acontece com o tenant brevemente suspenso, e fica registrada.
3. **Given** a restauração de um tenant, **When** medida, **Then** termina dentro do RTO de 4 horas.

---

### Edge Cases

- **Provisionamento simultâneo do mesmo tenant** (dois pedidos ao mesmo tempo): só um executa; o outro espera e recebe o mesmo resultado.
- **Migração que roda há muito tempo num tenant grande**: tem tempo limite por tenant; ao estourar, o tenant fica `migração_pendente` e os demais seguem.
- **Deploy de código novo com tenants ainda em versão anterior**: o código DEVE funcionar com a versão atual e a anterior de cada domínio (expandir → migrar → contrair). A etapa de contrair só roda quando 100% dos tenants estão na versão nova.
- **Tenant em `migração_pendente` recebendo requisições**: continua atendendo na versão anterior, compatível pela regra acima; se a diferença passar de uma versão, o tenant é suspenso automaticamente e um alerta crítico é emitido.
- **Rollback de migração que já passou da etapa de contrair**: não é permitido; o executor recusa e indica que é preciso uma migração corretiva.
- **Limite de quantidade de schemas no banco**: o executor avisa quando o total se aproximar de 80% do limite operacional definido no plano.
- **Identificador de tenant com caractere inválido para nome de schema**: o nome do schema deriva do identificador interno do tenant, nunca do nome ou do slug do negócio.
- **Credencial de domínio que perdeu permissão em um tenant**: a verificação periódica de permissões detecta e corrige, e registra o desvio.
- **Backup diário enquanto uma migração roda**: o backup não é bloqueado e a migração não é interrompida; o backup registra a versão de cada tenant no instante da cópia.

---

## Requirements *(mandatory)*

Formato: `REQ-TEN-NNN (origem: …)`.

### Functional Requirements

**Estrutura de dados por tenant**

- **REQ-TEN-001** (origem: D06 | CONST II | CONST 4.1): Cada tenant DEVE ter um espaço de dados (schema) próprio no banco, criado só pelo executor desta spec. Esse schema é **um só por tenant, compartilhado pelos domínios**: cada domínio é dono das próprias tabelas e usa credencial com permissão só nelas; nenhum domínio lê ou escreve tabela de outro (clarify 2026-11-25).
- **REQ-TEN-002** (origem: CONST 4.3 | edge case): O nome do schema DEVE derivar do identificador interno do tenant (UUIDv7), nunca do nome, do slug ou de qualquer dado do negócio.
- **REQ-TEN-003** (origem: CONST 4.4 | CONST VII): Cada domínio DEVE ser dono exclusivo das próprias tabelas dentro do espaço do tenant; nenhum domínio lê ou escreve tabela de outro, e não há join entre domínios.
- **REQ-TEN-004** (origem: CONST 5 | REQ-FND-028): Cada domínio DEVE acessar o banco com credencial própria, com permissão apenas sobre os próprios objetos, em todos os tenants. A concessão faz parte do provisionamento e da migração.
- **REQ-TEN-005** (origem: C5 | CONST II): DEVEM existir os espaços globais `koovela_identity`, `koovela_platform` e um espaço de projeções entre tenants, criados e migrados pelo mesmo executor, cada um com domínio dono definido.

**Registro de tenants**

- **REQ-TEN-010** (origem: DF 3.4.8 | CONST II): DEVE existir um registro de tenants, no espaço `koovela_platform`, com identificador, estado, nome do schema, versão de estrutura por domínio, datas de criação e de última migração, e falhas pendentes.
- **REQ-TEN-011** (origem: CONST I (padrão de máquina de estados) | DF 2.5): O tenant DEVE ter uma máquina de estados explícita: `provisionando` → `ativo` · `provisionando` → `falha_provisionamento` → `provisionando` · `ativo` ↔ `suspenso` · `migração_pendente` → `suspenso` (atraso de versão, REQ-TEN-037, ou ação do SRE) · `suspenso` → `arquivado` · `arquivado` → `suspenso` (só por comando explícito de reativação) · `ativo` ↔ `migração_pendente`. Toda outra transição DEVE ser recusada.
- **REQ-TEN-012** (origem: CONST V | DF 2.5): Toda transição de estado DEVE registrar ator, motivo, estado anterior, estado novo e horário, e publicar um evento.
- **REQ-TEN-013** (origem: C4 | D23 | CONST IV): Nenhum comando desta spec DEVE apagar o espaço de dados de um tenant (schema `t_<hex32>`), exceto o `purge` pedido pela spec 022 depois da janela de exportação e reativação (`reactivable_until` da spec 019), com aprovação dupla e auditoria (análise da 022, 2026-11-27). As cópias temporárias da restauração (`r_<hex32>_<ts>`, cópia restaurada ainda não trocada, e `o_<hex32>_<ts>`, conteúdo anterior à troca) não são o espaço de dados do tenant e são descartadas em até 7 dias, com o backup de 35 dias da 001 ainda cobrindo o período. Eliminação de dado é tratada pela spec 022 (privacidade), com conciliação entre retenção, portabilidade e guarda fiscal.

**Provisionamento**

- **REQ-TEN-020** (origem: CONST II | CONST 6 | DF 13): O provisionamento DEVE deixar o tenant `ativo`, com todas as estruturas de todos os domínios na versão atual e as permissões concedidas, em menos de 2 minutos (p95).
- **REQ-TEN-021** (origem: CONST II): O provisionamento DEVE ser idempotente (aceitar chave de idempotência) e seguro para repetir depois de falha parcial.
- **REQ-TEN-022** (origem: CONST II): Dois provisionamentos do mesmo tenant NÃO DEVEM executar ao mesmo tempo.
- **REQ-TEN-023** (origem: CONST 10 | DF 7): O provisionamento DEVE ser acionável por comando operacional (SRE), pela tela do back-office e por contrato interno, que a spec 005 (onboarding) vai usar. Nesta spec, só o perfil SRE pode acioná-lo.
- **REQ-TEN-024** (origem: DF 3.4.8): Após 3 falhas seguidas, o tenant DEVE ir para `falha_provisionamento` e um alerta DEVE ser emitido.

**Executor de migração**

- **REQ-TEN-030** (origem: CONST X | CONST XII): DEVE existir um único executor de migrações para todos os domínios, todos os tenants e todos os espaços globais.
- **REQ-TEN-031** (origem: CONST X): Toda migração DEVE ser versionada, reversível e idempotente, e seguir o padrão expandir → migrar → contrair. Migração sem passo de reversão DEVE ser rejeitada no PR.
- **REQ-TEN-032** (origem: CONST X | DF 13): A aplicação de migrações a todos os schemas NÃO DEVE causar indisponibilidade.
- **REQ-TEN-033** (origem: CONST X): A falha num tenant NÃO DEVE interromper os demais; o tenant com falha DEVE ficar `migração_pendente`, com o erro registrado, e ser reprocessável individualmente.
- **REQ-TEN-034** (origem: CONST X | C3): O executor DEVE aplicar primeiro num grupo canário de tenants e só seguir para os demais se o canário passar; o tamanho do canário é configurável, com padrão de 5% dos tenants ativos (mínimo 1).
- **REQ-TEN-035** (origem: CONST X): Só uma execução de migração por ambiente DEVE rodar por vez.
- **REQ-TEN-036** (origem: CONST X | edge case): O código DEVE funcionar com a versão atual e a anterior de cada domínio. A etapa de contrair só DEVE rodar quando 100% dos tenants estiverem na versão nova.
- **REQ-TEN-037** (origem: CONST X | edge case): Um tenant com mais de uma versão de atraso em qualquer domínio DEVE ser suspenso automaticamente, com alerta crítico.
- **REQ-TEN-038** (origem: CONST X | CONST 6 escala): Uma migração típica (sem cópia de grandes volumes) DEVE chegar a 500 tenants em até 30 minutos.
- **REQ-TEN-039** (origem: CONST VIII item 5 | CONST 9.5): O pipeline de PR DEVE aplicar toda migração nova, e o rollback dela, sobre vários schemas de tenant sintéticos (no mínimo 3 no PR e 50 em staging), como portão de merge.

**Isolamento**

- **REQ-TEN-040** (origem: CONST II): A conexão com o banco DEVE ser obtida apenas por um resolvedor de schema, a partir do contexto de tenant da requisição ou da mensagem; o lint DEVE rejeitar conexão montada à mão e consulta que atravesse schemas de tenant.
- **REQ-TEN-041** (origem: CONST II): Pedido de conexão sem contexto de tenant, para recurso que exige tenant, DEVE ser recusado; NÃO DEVE existir tenant padrão.
- **REQ-TEN-042** (origem: CONST II): O contexto de tenant DEVE ser propagado em chamadas entre domínios e em eventos. Nesta spec ele é preenchido por fixture de teste e por comando operacional; a resolução a partir do token, na borda, é da spec 003.
- **REQ-TEN-043** (origem: CONST II): Chaves de cache e de lock, nomes de fila, objetos de armazenamento e logs DEVEM levar o tenant como prefixo ou campo; as bibliotecas compartilhadas DEVEM aplicar isso automaticamente.
- **REQ-TEN-044** (origem: CONST II | DF 6.1 inv. 3 | CONST VIII): DEVE existir uma suíte de isolamento, portão de merge, que cria dois tenants sintéticos e verifica que nenhum acesso a partir de um alcança dados do outro, com resposta 404. Toda spec seguinte acrescenta seus endpoints e consumidores a essa suíte.
- **REQ-TEN-045** (origem: CONST II): Requisições de aplicação para tenant fora do estado `ativo` (ou `migração_pendente` dentro do limite) DEVEM ser recusadas com erro Problem Details de `code` estável por estado.

**Operação e back-office**

- **REQ-TEN-050** (origem: DF 9.5 | CONST 10): A tela "Provisionamento e migração de schema" do back-office DEVE mostrar: lista de tenants com estado, versão por domínio e falhas; andamento da execução em curso; detalhe de falha sem dado de negócio; e ações de provisionar, reprocessar, reverter, suspender, reativar e arquivar.
- **REQ-TEN-051** (origem: CONST V | DF 7): Toda ação da tela DEVE exigir justificativa e confirmação, e ficar registrada com ator, ação, alvo, justificativa, IP, `request_id` e horário. O registro nasce nesta spec e passa para a trilha de auditoria append-only na spec 004.
- **REQ-TEN-052** (origem: CONST 3 | REQ-FND-034 | DF 7): Até a spec 003, o acesso à tela DEVE depender da autenticação de borda com MFA de `admin.koovela.com`, restrita aos perfis SRE. A partir da 003, também da permissão "Provisionar schema" do RBAC.
- **REQ-TEN-053** (origem: DF 3.4.8 | CONST X): DEVEM existir alertas para: falha de provisionamento, tenant `migração_pendente`, canário com falha, tenant com versão atrasada, execução de migração parada há mais de 15 minutos e quantidade de schemas acima de 80% do limite operacional.
- **REQ-TEN-054** (origem: CONST X): Uma verificação periódica (no mínimo diária) DEVE confirmar, em todos os tenants, que a estrutura e as permissões correspondem à versão registrada, e registrar qualquer desvio.
- **REQ-TEN-055** (origem: CONST X | CONST 6): DEVE ser possível restaurar um único tenant a partir do backup, num espaço separado, para um instante escolhido, e trocar o espaço em uso pelo restaurado mediante aprovação, sem afetar outros tenants, dentro do RTO de 4 horas.

**Dados sintéticos e testes**

- **REQ-TEN-060** (origem: REQ-FND-003 | CONST 4.2 `packages/testing`): DEVE existir um gerador determinístico de tenants sintéticos, usado no ambiente local (no mínimo 3 tenants), no CI (no mínimo 3) e em staging (no mínimo 50).
- **REQ-TEN-061** (origem: CONST VIII): Os testes de integração DEVEM rodar contra banco real com vários schemas de tenant, nunca contra simulação.

### Key Entities

- **Tenant** (`tenant`): o Cliente da Koovela (DF 19). Identificador UUIDv7, estado, nome do schema, versão por domínio, datas. Não guarda nome comercial, documento nem contato; esses dados são da spec 005.
- **Transição de estado do tenant**: tenant, estado anterior, estado novo, ator, motivo, horário.
- **Migração**: domínio, versão, passos de aplicar e de reverter, etapa (expandir, migrar, contrair).
- **Execução de migração**: identificador, versões alvo, início, fim, grupo canário, contagens de sucesso, falha e pendência, quem iniciou.
- **Resultado por tenant**: execução, tenant, domínio, versão, resultado, erro (sem dado de negócio), duração.
- **Espaço global**: nome (`koovela_identity`, `koovela_platform`, projeções), domínio dono, versão.
- **Pedido de provisionamento**: tenant, chave de idempotência, tentativas, resultado, duração.
- **Restauração de tenant**: tenant, instante restaurado, espaço temporário, aprovação, resultado, duração.

---

## Telas do protótipo cobertas

| Superfície | Tela | Código |
|---|---|---|
| Back-office | Provisionamento e migração de schema (DF 9.5) | Código do Figma registrado no plano |

A tela "Tenants" do back-office (DF 9.5) fica para a spec 021; aqui só a lista operacional, dentro da tela de provisionamento.

---

## Regras e estados

**Estados do tenant** (REQ-TEN-011):

| De | Para | Quem dispara |
|---|---|---|
| — | `provisionando` | Pedido de provisionamento |
| `provisionando` | `ativo` | Executor, ao concluir |
| `provisionando` | `falha_provisionamento` | Executor, após 3 falhas |
| `falha_provisionamento` | `provisionando` | SRE, ao repetir |
| `ativo` | `migração_pendente` | Executor, ao falhar migração |
| `migração_pendente` | `ativo` | Executor, ao reprocessar com sucesso |
| `ativo` ou `migração_pendente` | `suspenso` | SRE ou, a partir das specs 019 e 021, cobrança e back-office; ou o executor, por atraso de versão |
| `suspenso` | `ativo` | Comando de reativação |
| `suspenso` | `arquivado` | Comando de arquivamento |
| `arquivado` | `suspenso` | Comando explícito de reativação |

**Regras:**

- O espaço de dados nunca é apagado por esta spec (REQ-TEN-013).
- Um tenant `arquivado` continua em backup e em migração.
- Contrair só depois que 100% dos tenants estão na versão nova.
- Uma execução de migração por ambiente, um provisionamento por tenant.

---

## Dados pessoais

Esta spec **não armazena dado pessoal de negócio**: o registro de tenants guarda apenas identificadores técnicos, estados e versões.

| Item | Definição |
|---|---|
| **Campos armazenados** | Identificador do tenant, estado, nome do schema, versões, erros técnicos. Nenhum nome, documento ou contato |
| **Ator das ações operacionais** | Guardado como identificador do membro da Gestão. O e-mail não é gravado no registro e é mascarado em log |
| **IP do ator** | Guardado no registro da ação (CONST V), com a mesma retenção da trilha de auditoria (spec 004) |
| **Mensagens de erro de migração** | NÃO DEVEM conter valores de linha do tenant; só estrutura, código e posição |
| **Restauração de tenant** | O espaço temporário restaurado tem os mesmos controles de acesso do original e é removido em até 7 dias após a troca ou o descarte |
| **Base legal** | Execução de contrato com o tenant e segurança da plataforma (LGPD art. 7, V e IX) |
| **Quem acessa** | Engenharia/SRE |

---

## Permissões

Recorte da matriz RBAC (DF 7):

| Ação | Quem |
|---|---|
| Provisionar schema | SRE |
| Executar, reprocessar e reverter migração | SRE |
| Suspender, reativar e arquivar tenant | SRE nesta spec; cobrança (019) e back-office (021) ganham o direito depois, por contrato |
| Restaurar tenant | SRE, com aprovação registrada |
| Ver a tela de provisionamento | SRE |

Nenhum perfil de tenant (Proprietário, Gerente, Recepção, Colaborador) nem o consumidor tem acesso a qualquer função desta spec.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `tenancy.tenant.provisioning_requested.v1` | Pedido de provisionamento aceito |
| `tenancy.tenant.provisioned.v1` | Tenant chega a `ativo` pela primeira vez |
| `tenancy.tenant.provisioning_failed.v1` | Tenant vai para `falha_provisionamento` |
| `tenancy.tenant.suspended.v1` / `.reactivated.v1` / `.archived.v1` | Mudança de estado |
| `tenancy.migration_run.started.v1` / `.completed.v1` / `.failed.v1` | Início e fim de execução |
| `tenancy.tenant.migration_failed.v1` | Tenant vai para `migração_pendente` |
| `tenancy.tenant.restored.v1` | Troca para o espaço restaurado |

Todos seguem a CONST IX (outbox, `tenant_id`, `correlation_id`, sem PII).

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Tempo de provisionamento (p95) | DF 3.4.8 · CONST 6 | Abaixo de 2 minutos |
| Taxa de sucesso de provisionamento na primeira tentativa | DF 3.4.8 | Acompanhada; acima de 99% |
| Falhas de migração por release | DF 14 | Acompanhada; 0 tenants `migração_pendente` ao fim do release |
| Duração da execução de migração para todos os tenants | REQ-TEN-038 | Até 30 minutos para 500 tenants |
| Requisições com erro durante migração | REQ-TEN-032 | 0 |
| Tenants por estado | — | Painel |
| Tenants com versão atrasada | REQ-TEN-037 | 0 por mais de 24 horas |
| Desvios encontrados pela verificação diária | REQ-TEN-054 | 0 |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% dos tenants novos ficam prontos para uso em menos de 2 minutos, e repetir o pedido nunca cria duplicidade.
- **SC-002**: Uma mudança de estrutura chega a 500 tenants sintéticos em até 30 minutos, sem nenhuma requisição com erro durante a execução.
- **SC-003**: Num teste com um tenant forçado a falhar, 100% dos demais tenants recebem a migração, e o tenant com falha é reprocessado com sucesso por uma única ação.
- **SC-004**: A suíte de isolamento passa em 100% das execuções do CI, e nenhum caso de dado de um tenant visto a partir de outro é registrado em produção (meta 0).
- **SC-005**: O SRE responde "em que versão está cada tenant e quais falharam?" em menos de 1 minuto, pela tela do back-office, sem acessar o banco.
- **SC-006**: Um único tenant é restaurado para um instante escolhido em até 4 horas, sem que outros tenants percebam.
- **SC-007**: Nenhum espaço de dados de tenant é apagado por qualquer comando desta spec, verificado por teste.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| Divisão do espaço do tenant entre domínios (REQ-TEN-001) | Número de schemas (N ou N × M), forma das credenciais, duração da migração, limite do banco, custo de operação (`[C3]`) | **Resolvido (clarify 2026-11-25)**: um schema por tenant, tabelas e credenciais por domínio |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Fronteira do tenant | ASSUMIDO: tenant = Cliente (DF 19). Um Cliente com vários negócios e filiais tem um único espaço de dados; negócios e filiais são linhas dentro dele (DF 4.1: "um Cliente pode ter mais de um negócio") |
| **C3** / D44 (proposta) | Segue a decisão da spec 001: dois hosts, sem orquestrador; o executor roda como tarefa do deploy |
| **C5** | Os espaços globais nascem aqui, vazios; o conteúdo vem nas specs 003 e 009 |
| **C4** | Esta spec nunca apaga espaço de dados; eliminação fica para a spec 022 |
| **PEN-20** | Decidida na spec 001 (proposta D44) |

---

## Fora do escopo desta especificação

- Cadastro do Cliente, do negócio, das filiais, do slug e da vertical (spec 005).
- Resolução do tenant a partir do token, identidade, login e RBAC (spec 003).
- Trilha de auditoria append-only e feature flags (spec 004); aqui só nasce o registro das ações.
- Tela "Tenants" completa do back-office, KYC e concessões (spec 021).
- Suspensão por inadimplência (spec 019), que usa o comando de suspensão desta spec.
- Eliminação de dados e portabilidade (spec 022).
- Réplica de leitura e cópia analítica para o BI (spec 023).
- Tabelas de negócio de qualquer domínio; cada spec traz as suas migrações.

---

## Assumptions

- Tenant = Cliente, como no glossário (DF 19). Um espaço de dados por Cliente, contendo todos os seus negócios e filiais.
- O grupo canário padrão é de 5% dos tenants ativos (mínimo 1), configurável.
- Metas sem número nas fontes foram fixadas assim: migração de 500 tenants em até 30 minutos; execução parada há 15 minutos gera alerta; espaço temporário de restauração removido em até 7 dias; tenants sintéticos: no mínimo 3 no ambiente local e no CI, e 50 em staging.
- O limite operacional de schemas por instância de banco é definido no plano, com medição em staging.
- O executor roda como passo do deploy da spec 001, antes da troca de versão dos processos, e também por comando operacional.
- O registro das ações feitas na tela nasce nesta spec e migra para a trilha append-only da spec 004 sem perda.
