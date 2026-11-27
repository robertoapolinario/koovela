# Research: Tenancy e provisionamento de schema (002)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base técnica herdada da spec 001 (Node 24, TypeScript strict, Fastify, Kysely, MySQL 8.4, processos `gateway`/`core`/`workers`, Compose sem orquestrador). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Nome do schema e espaços globais

- **Decisão**: schema de tenant `t_<uuidv7 sem hífens>` (34 caracteres, dentro do limite de 64 do MySQL), derivado só do `tenant_id` (REQ-TEN-002). Espaços globais: `koovela_platform` (dono: `tenancy`), `koovela_identity` (dono: `identity`, conteúdo na 003) e `koovela_projections` (dono por tabela: cada projeção tem um domínio dono; `consumer_appointments_index` será de `scheduling`).
- **Por quê**: nome estável, sem dado do negócio, sem caractere inválido, e o prefixo `t_` permite grants e filtros por padrão.
- **Alternativas**: nome pelo slug (muda e vaza dado do negócio); número sequencial (expõe contagem, CONST 4.3).

## R2. Dono das tabelas dentro do schema do tenant

- **Decisão**: toda tabela leva o prefixo do domínio dono (`catalog_service`, `scheduling_appointment`, …). O executor rejeita migração de um domínio que crie, altere ou leia tabela de outro prefixo (verificação estática do SQL gerado + teste).
- **Por quê**: REQ-TEN-003 com um schema compartilhado (decisão do clarify); torna a propriedade visível e verificável.
- **Alternativas**: schema por domínio (rejeitado no clarify por causa do `[C3]`).

## R3. Credenciais e permissões por domínio

- **Decisão**:
  - Um usuário MySQL por domínio (`svc_catalog`, `svc_scheduling`, …), cada um com um **role** (`r_catalog`, …). Os grants são **por tabela** em cada schema de tenant (`GRANT SELECT, INSERT, UPDATE, DELETE ON t_x.catalog_service TO r_catalog`), gerados pelo executor a cada provisionamento e migração.
  - DDL só com o usuário `koovela_migrator` (com `CREATE`, `ALTER`, `DROP` em `t\_%` e nos globais), usado apenas pelo executor; domínios nunca têm DDL.
  - Tabelas append-only (registro de ações, outbox processado) recebem só `INSERT, SELECT`.
  - Verificação diária (REQ-TEN-054) compara `information_schema.TABLE_PRIVILEGES` com o esperado e corrige.
- **Por quê**: o MySQL não aceita curinga em nome de tabela, então "permissão só nas próprias tabelas" exige grant por tabela. Estimativa: 500 tenants × ~150 tabelas ≈ 75 mil linhas em `mysql.tables_priv`, volume aceitável.
- **Alternativas**: grant por schema inteiro (quebra o REQ-TEN-004); views por domínio (dobra os objetos e complica migração).

## R4. Executor de migração

- **Decisão**: um pacote único `@koovela/migrator` em `infra/migrations`, com CLI (`pnpm koovela migrate …`) e API interna para o domínio `tenancy`.
  - Migrações em `services/<domínio>/migrations/NNNN_<nome>.ts`, cada uma com `phase` (`expand` | `migrate` | `contract`), `up`, `down` e `checksum`. PR sem `down` falha (REQ-TEN-031).
  - Por schema, a tabela `_migrations` (domínio, versão, fase, checksum, aplicada em). No `koovela_platform`, `tenant_domain_version` (registro consultado pela tela e pelo gating).
  - Execução: trava global por ambiente (`GET_LOCK('koovela:migration:<env>')` + linha `migration_run` em andamento, REQ-TEN-035); canário (5%, mínimo 1, REQ-TEN-034) e depois o resto, em paralelo de 8 tenants; tempo limite por tenant de 5 minutos; falha → `migração_pendente`, segue para o próximo (REQ-TEN-033); reprocessamento só dos pendentes.
  - DDL sem indisponibilidade: o executor só aceita `ALGORITHM=INSTANT` ou `INPLACE, LOCK=NONE` na fase `expand`/`contract`; cópia de dados vai para a fase `migrate`, em lotes. `contract` só roda com 100% dos tenants na versão nova (REQ-TEN-036); `down` de uma `contract` já aplicada é recusado (edge case).
  - Ordem de aplicação em cada release: globais → canário → demais tenants → troca de versão dos processos (passo do deploy da spec 001).
- **Por quê**: Princípio XII (um executor) e Princípio X (reversível, multi-schema, sem indisponibilidade).
- **Alternativas**: Kysely Migrator puro (não orquestra N schemas nem canário); Flyway/Liquibase (Java no host, sem canário multi-tenant); gh-ost/pt-online-schema-change (pesados para tabelas pequenas por tenant; ficam como opção para tabela grande).

## R5. Provisionamento em menos de 2 minutos

- **Decisão**: cada release gera por domínio uma **baseline** (DDL consolidado da versão atual, gerado a partir de um schema migrado do zero e verificado por checksum). Provisionar = `CREATE DATABASE t_x` → aplicar as baselines → registrar as versões → grants → verificação de estrutura → estado `ativo` → evento pelo outbox. Idempotência por `idempotency_key` em `provisioning_request`; trava por tenant (`GET_LOCK('koovela:provision:<tenant_id>')`); retentativa com backoff (até 3 falhas → `falha_provisionamento` + alerta). Retomada: passos são idempotentes (`CREATE … IF NOT EXISTS`, grants repetíveis), então repetir continua de onde parou.
- **Por quê**: aplicar centenas de migrações históricas por tenant novo cresceria com o tempo; a baseline mantém o p95 abaixo de 2 minutos (REQ-TEN-020). Um teste no CI garante que "baseline" e "todas as migrações do zero" produzem a mesma estrutura.
- **Alternativas**: replay de todas as migrações (lento com o tempo); clonar um schema modelo com `mysqldump` (mais lento e frágil).

## R6. Resolvedor de schema e contexto de tenant

- **Decisão**: em `packages/platform/tenancy`:
  - `TenantContext` em `AsyncLocalStorage` (preenchido nesta spec por fixture e por comando operacional; pela borda na 003);
  - `db.forTenant()` devolve um Kysely do domínio atual com `withSchema('t_<id>')`, usando **um pool por domínio** (não por tenant);
  - sem contexto → erro `tenancy.context_missing` (REQ-TEN-041);
  - estado do tenant verificado no resolvedor com cache Redis (`t:{tenant_id}:state`, TTL 30 s, invalidado pelos eventos de estado); fora de `ativo` (ou `migração_pendente` dentro do limite) → Problem Details com `code` por estado (REQ-TEN-045).
  - Regras de lint (ESLint + dependency-cruiser): proibido importar `mysql2`, `kysely` (driver) ou usar `withSchema`/`sql.raw` com nome de schema fora de `packages/platform`.
- **Por quê**: Princípio II ("resolvedor de schema, nunca montado à mão"); um pool por domínio evita milhares de conexões.
- **Alternativas**: `USE t_x` por conexão (estado na conexão do pool, risco de vazamento entre requisições); pool por tenant (conexões demais).

## R7. Prefixo de tenant em cache, lock, fila, storage e log

- **Decisão**: helpers em `packages/platform`: `redisKey(...)` → `t:{tenant_id}:…`; `lockKey(...)`; mensagens com `tenant_id` no envelope e no cabeçalho AMQP; objetos `tenants/{tenant_id}/…`; logger com `tenant_id` do contexto. Lint proíbe chamar o cliente Redis ou o publicador sem os helpers.
- **Por quê**: REQ-TEN-043 aplicado automaticamente.

## R8. Suíte de isolamento

- **Decisão**: `packages/testing/isolation`: cria tenants A e B sintéticos, expõe um registro onde cada domínio declara casos (endpoint, consumidor, leitura de cache) e roda a matriz "contexto A → recurso de B = 404". Nesta spec os casos são do próprio `tenancy` e do resolvedor; cada spec seguinte adiciona os seus (REQ-TEN-044). Portão de merge.

## R9. Estado do tenant e máquina de estados

- **Decisão**: máquina de estados explícita (tabela de transições permitidas no código + `CHECK` no banco para valores), transição registrada em `tenant_state_transition` e evento pelo outbox na mesma transação (CONST IX). Teste de propriedade (fast-check) gera sequências de comandos e verifica que só as transições permitidas acontecem (REQ-TEN-011).

## R10. Restauração de um tenant

- **Decisão**: `pnpm koovela tenant restore <tenant_id> --point <instante>`:
  1. sobe um MySQL temporário no host de dados;
  2. carrega o dump diário mais próximo anterior ao instante (só o schema `t_x`, `includeSchemas`);
  3. aplica os binlogs até o instante com `mysqlbinlog --database=t_x --stop-datetime`;
  4. copia o schema restaurado para `r_<id>_<timestamp>` no banco principal;
  5. após aprovação registrada: suspende o tenant, troca as tabelas com um `RENAME TABLE` atômico (`t_x.a → o_<hex32>_<ts>.a`, `r_x.a → t_x.a`), reaplica os grants e reativa.
  `o_*` e `r_*` são removidos em até 7 dias (o único comando que apaga é sobre cópias, nunca sobre o espaço em uso; REQ-TEN-013).
- **Por quê**: REQ-TEN-055 dentro do RTO de 4 horas sem tocar nos outros tenants.
- **Alternativas**: restaurar o banco inteiro (derruba todos); restauração lógica por tabela a partir do dump completo (sem ponto no tempo).

## R11. Limite operacional de schemas

- **Decisão**: limite inicial de **1.000 tenants por instância** (≈ 150 mil tabelas), a confirmar por teste de carga em staging; parâmetros `table_open_cache`, `table_definition_cache` e `innodb_open_files` dimensionados para isso. Alerta em 80% (REQ-TEN-053).
- **Por quê**: o MySQL não tem limite rígido de schemas, mas cache de tabelas e descritores de arquivo degradam; 1.000 dá 2× a escala inicial da CONST 6.

## R12. Contratos e tela

- **Decisão**: API interna do domínio `tenancy` em `/v1/internal/tenancy/*` (só chamada por serviços, com credencial de serviço, nunca pela borda pública) e API de operação em `/v1/admin/tenancy/*` para o back-office. Até a 003, o gateway aceita a API de operação só com o JWT do Cloudflare Access válido (`Cf-Access-Jwt-Assertion`) de membro do grupo SRE (REQ-TEN-052). Tela: **G03 · Provisionamento e migração de schema** (Figma, página "05 · Back-office Gestão + BI"), no item de menu "Schemas" do `admin-web`.
- **Registro de ações** (REQ-TEN-051): `koovela_platform.ops_action_log`, só `INSERT`/`SELECT`, migrado sem perda para a trilha da spec 004.
