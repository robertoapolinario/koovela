# Data Model: Auditoria e feature flags (004)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Espaço `koovela_platform`, dono `backoffice` (tabelas `backoffice_*`). UUIDv7 em `BINARY(16)`, datas `DATETIME(6)` UTC.

---

## 1. Outbox de auditoria (em cada domínio)

Tabela `<domínio>_audit_outbox`, criada por migração em cada domínio que tem ação auditável, no mesmo schema onde a ação grava (schema do tenant ou espaço global do domínio).

| Coluna | Regra |
|---|---|
| `audit_id` | PK; UUIDv5 da chave de idempotência quando houver, senão UUIDv7 |
| `payload` | JSON no formato de [contracts/audit-record.schema.json](./contracts/audit-record.schema.json) |
| `created_at` | — |
| `ingested_at` | NULL até o ingestor copiar |

Gravado na mesma transação da ação. Usuário do domínio: `INSERT, SELECT`; o ingestor (`svc_backoffice_audit`) tem `SELECT, UPDATE(ingested_at)` só nessa tabela.

## 2. Trilha central

### `backoffice_audit_log` (append-only, particionada por mês)

| Coluna | Regra |
|---|---|
| `seq` | `BIGINT` PK, contínuo, atribuído pelo ingestor |
| `audit_id` | UNIQUE (deduplicação) |
| `prev_hash`, `hash` | `BINARY(32)`; `hash = SHA-256(prev_hash ‖ JCS(registro))` |
| `occurred_at` | Horário da ação (UTC) |
| `ingested_at` | — |
| `category` | `management` \| `financial` \| `support` \| `tenant_admin` \| `audit_access` |
| `action` | Código estável da matriz |
| `result` | `allowed` \| `denied` |
| `actor_id`, `actor_profile` | Identificador e perfil (nunca nome ou e-mail) |
| `tenant_id` | NULL quando não há tenant; indexado |
| `support_session_id` | NULL fora de sessão |
| `target_type`, `target_id` | — |
| `justification` | Texto até 500 caracteres |
| `ip` | `VARBINARY(16)` completo |
| `request_id`, `correlation_id` | — |
| `source_domain` | Domínio de origem |
| `details` | JSON sem conteúdo de negócio (ex.: valor anterior e novo de uma flag) |

Permissões: só `INSERT, SELECT` para `svc_backoffice_audit`; `SELECT` para a API de consulta; nenhum `UPDATE`/`DELETE` para usuário de aplicação.

### `backoffice_audit_seal`

`seal_date` (PK), `first_seq`, `last_seq`, `record_count`, `last_hash`, `merkle_root`, `external_uri` (objeto no R2 com bucket lock), `written_at`, `status` (`pending` \| `written` \| `failed`), `attempts`.

### `backoffice_audit_subject` (apagável)

`subject_id` (PK = `actor_id`/`target_id`), `display_name` 🔒, `email` 🔒, `anonymized_at`. A spec 022 apaga ou anonimiza aqui; a cadeia não muda.

### `backoffice_audit_query`

`query_id`, `actor_id`, `kind` (`search` \| `export`), `filters` (JSON), `justification` (obrigatória em `export`), `result_uri`, `expires_at` (+24 h), `status`. Cada linha também gera um registro de categoria `audit_access` na própria trilha (REQ-AUD-024).

## 3. Feature flags

### Definição (repositório): `packages/contracts/flags/flags.yaml`

Formato em [contracts/flags.schema.json](./contracts/flags.schema.json): `key`, `description`, `owner`, `type`, `safe_value`, `remove_by` (obrigatório em `release`).

### `backoffice_feature_flag`

| Coluna | Regra |
|---|---|
| `flag_key` | PK; precisa existir na definição |
| `type` | Copiado da definição |
| `state` | `active` \| `expired` \| `unused` \| `removed` |
| `version` | Concorrência otimista |
| `last_evaluated_at` | Da métrica agregada |
| `updated_at` | — |

### `backoffice_feature_flag_version`

| Coluna | Regra |
|---|---|
| `flag_key` + `version` | PK |
| `config` | JSON por ambiente: `{ default, kill_switch_off, exclude[], include[], verticals[], percentage, salt }` |
| `author_id`, `justification`, `created_at` | — |
| `reverted_from` | Versão de origem quando é um "voltar" |

Estados: `active` → `expired` (data passou) → `removed`; `active` → `unused` (30 dias sem avaliação) → `active` \| `removed`. `removed` não volta.

### Precedência de avaliação

```
kill_switch_off ? false
: tenant ∈ exclude ? false
: tenant ∈ include ? true
: vertical ∈ verticals ? true
: bucket(flag_key, salt, tenant) < percentage ? true
: default[ambiente]
```

Sem tenant: só `kill_switch_off` e `default`. Falha: último valor conhecido → `safe_value`.
