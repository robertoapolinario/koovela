# Data Model: Tenancy e provisionamento (002)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Convenções (CONST 4.3): UUIDv7 armazenado como `BINARY(16)`, datas `DATETIME(6)` em UTC, nomes em inglês. Nenhum campo pessoal; o ator é um identificador técnico.

---

## 1. Espaço `koovela_platform` (dono: `tenancy`)

### `tenant`

| Coluna | Tipo | Regra |
|---|---|---|
| `tenant_id` | `BINARY(16)` PK | UUIDv7 |
| `schema_name` | `VARCHAR(64)` UNIQUE | `t_<hex32>`, derivado de `tenant_id` |
| `state` | `VARCHAR(32)` | `provisioning` \| `active` \| `migration_pending` \| `suspended` \| `archived` \| `provisioning_failed` (CHECK) |
| `state_reason` | `VARCHAR(64)` | Motivo principal exibido (derivado de `tenant_suspension`) |
| `synthetic` | `BOOLEAN` | `true` só em dev, CI e staging |
| `created_at`, `updated_at` | `DATETIME(6)` | — |
| `last_migrated_at` | `DATETIME(6)` NULL | — |

Sem nome comercial, documento ou contato (ficam na spec 005, dentro do schema do tenant).

### `tenant_suspension` (análise da 021, 2026-11-27)

`tenant_id`, `reason` (`billing_overdue` \| `fraud` \| `version_lag` \| `restore` \| `manual`), `source` (domínio que suspendeu), `started_at`, `ended_at`. O tenant fica `suspended` enquanto houver pelo menos um motivo aberto; `reactivate` encerra só o motivo da própria origem e volta a `active` quando não sobra nenhum.

### `tenant_domain_version`

| Coluna | Tipo | Regra |
|---|---|---|
| `tenant_id` | FK → `tenant` | PK composta |
| `domain` | `VARCHAR(32)` | PK composta; domínio da CONST 4.4 |
| `version` | `INT` | Última migração aplicada |
| `phase` | `VARCHAR(8)` | `expand` \| `migrate` \| `contract` |
| `applied_at` | `DATETIME(6)` | — |

Também existe a mesma informação dentro de cada schema (`t_x._migrations`), que é a fonte da verdade; esta tabela é o registro consultado. A verificação diária confere as duas.

### `tenant_state_transition` (append-only: só `INSERT`/`SELECT`)

| Coluna | Tipo |
|---|---|
| `transition_id` | `BINARY(16)` PK |
| `tenant_id` | FK |
| `from_state`, `to_state` | `VARCHAR(32)` |
| `actor_type` | `system` \| `sre` \| `service` |
| `actor_id` | `VARCHAR(64)` (id técnico, nunca e-mail) |
| `reason` | `VARCHAR(500)` (sem PII) |
| `correlation_id` | `BINARY(16)` |
| `occurred_at` | `DATETIME(6)` |

### `provisioning_request`

| Coluna | Tipo | Regra |
|---|---|---|
| `request_id` | `BINARY(16)` PK | — |
| `tenant_id` | FK | — |
| `idempotency_key` | `VARCHAR(128)` UNIQUE | Repetição devolve o mesmo resultado |
| `attempts` | `TINYINT` | 3 falhas → `provisioning_failed` |
| `status` | `pending` \| `running` \| `succeeded` \| `failed` | — |
| `last_error_code` | `VARCHAR(64)` NULL | Sem dado de linha |
| `started_at`, `finished_at` | `DATETIME(6)` | `duration` alimenta a métrica p95 |

### `migration_run`

| Coluna | Tipo | Regra |
|---|---|---|
| `run_id` | `BINARY(16)` PK | — |
| `environment` | `VARCHAR(16)` | — |
| `kind` | `apply` \| `reprocess` \| `rollback` | — |
| `target` | JSON | `{ domínio: versão }` |
| `canary_size` | `INT` | 5% dos ativos, mínimo 1 |
| `status` | `running` \| `canary_failed` \| `completed` \| `completed_with_failures` \| `failed` | No máximo uma `running` por ambiente (índice único parcial via coluna gerada) |
| `succeeded`, `failed`, `pending` | `INT` | Contadores para a tela |
| `started_by` | `VARCHAR(64)` | — |
| `started_at`, `finished_at`, `heartbeat_at` | `DATETIME(6)` | `heartbeat_at` parado há 15 min → alerta |

### `migration_tenant_result`

| Coluna | Tipo |
|---|---|
| `run_id` + `tenant_id` + `domain` | PK |
| `version` | `INT` |
| `result` | `succeeded` \| `failed` \| `skipped` |
| `error_code`, `error_detail` | `VARCHAR` (só estrutura, código e posição; nunca valores de linha) |
| `duration_ms` | `INT` |

### `global_space`

| Coluna | Tipo |
|---|---|
| `name` | `koovela_identity` \| `koovela_platform` \| `koovela_projections` (PK) |
| `owner_domain` | `VARCHAR(32)` |
| `version` | `INT` |

### `tenant_restore`

| Coluna | Tipo | Regra |
|---|---|---|
| `restore_id` | `BINARY(16)` PK | — |
| `tenant_id` | FK | — |
| `restore_point` | `DATETIME(6)` | — |
| `temp_schema` | `VARCHAR(64)` | `r_<hex32>_<ts>`; na troca, o conteúdo anterior vai para `o_<hex32>_<ts>` (prefixos fora de `t_`, REQ-TEN-013) |
| `status` | `restoring` \| `ready_for_review` \| `approved` \| `swapped` \| `discarded` \| `failed` | — |
| `approved_by` | `VARCHAR(64)` NULL | Obrigatório para `swapped` |
| `cleanup_due_at` | `DATETIME(6)` | 7 dias após troca ou descarte |

### `ops_action_log` (append-only; migra para a trilha da spec 004)

`action_id`, `actor_id`, `action` (`provision` \| `reprocess` \| `rollback` \| `suspend` \| `reactivate` \| `archive` \| `restore_approve`), `target_tenant_id`, `justification`, `ip` (completo, retenção da trilha de auditoria), `request_id`, `occurred_at`.

### `outbox` (do `tenancy`)

Conforme o envelope da spec 001 (`event_id`, `event_type`, `version`, `tenant_id`, `occurred_at`, `actor`, `correlation_id`, `payload`, `published_at`). Gravado na mesma transação da mudança de estado.

---

## 2. Dentro de cada schema de tenant `t_<hex32>`

| Tabela | Dono | Conteúdo |
|---|---|---|
| `_migrations` | executor (`koovela_migrator`) | `domain`, `version`, `phase`, `checksum`, `applied_at` |
| `<domínio>_*` | cada domínio | Vazio nesta spec; tabelas chegam nas specs de cada domínio |

## 3. Máquina de estados do tenant

```
(novo) ──▶ provisioning ──▶ active ◀──▶ migration_pending
              │  ▲            │  ▲            │
              ▼  │            ▼  │            ▼
     provisioning_failed     suspended ◀──────┘
                               │  ▲
                               ▼  │ (reativação explícita)
                             archived
```

Permitidas (REQ-TEN-011): `provisioning→active`, `provisioning→provisioning_failed`, `provisioning_failed→provisioning`, `active↔migration_pending`, `active→suspended`, `migration_pending→suspended`, `suspended→active`, `suspended→archived`, `archived→suspended`. Qualquer outra é recusada com `tenancy.transition_not_allowed`.

Gating de requisição (REQ-TEN-045):

| Estado | Aceita requisição de aplicação? | `code` do erro |
|---|---|---|
| `active` | Sim | — |
| `migration_pending` | Sim, se atraso ≤ 1 versão | `tenancy.version_lag` (se acima, o tenant é suspenso) |
| `provisioning` | Não | `tenancy.tenant_provisioning` |
| `provisioning_failed` | Não | `tenancy.tenant_unavailable` |
| `suspended` | Não | `tenancy.tenant_suspended` |
| `archived` | Não | `tenancy.tenant_archived` |

## 4. Credenciais

| Usuário | Role | Permissões |
|---|---|---|
| `koovela_migrator` | — | DDL em `t\_%`, `r\_%` e nos globais; usado só pelo executor |
| `svc_tenancy` | `r_tenancy` | DML nas tabelas de `koovela_platform` do `tenancy`; só `INSERT`/`SELECT` nas append-only |
| `svc_<domínio>` | `r_<domínio>` | DML só nas tabelas `<domínio>_*` de cada `t_x` e nas suas tabelas globais |
