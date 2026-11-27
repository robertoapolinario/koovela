# Quickstart de validação: Tenancy e provisionamento (002)

Pré-requisito: ambiente da spec 001 no ar (`pnpm koovela up`). Contratos em [contracts/](./contracts/), tabelas em [data-model.md](./data-model.md).

## 1. Espaços globais e tenants sintéticos (Histórias 1 e 6)

```bash
pnpm koovela migrate --globals          # cria koovela_platform, koovela_identity, koovela_projections
pnpm koovela tenant seed --count 3      # 3 tenants sintéticos determinísticos
pnpm koovela tenant list
```

Esperado: os três espaços globais com versão registrada; 3 tenants `active`, cada um com `schema_name = t_<hex32>` e versão por domínio.

## 2. Provisionamento idempotente em < 2 min (História 1)

```bash
KEY=$(uuidgen)
pnpm koovela tenant provision --tenant-id <uuidv7> --key $KEY --time
pnpm koovela tenant provision --tenant-id <uuidv7> --key $KEY      # repetição
```

Esperado: `active` em menos de 2 minutos; a repetição devolve o mesmo `request_id`, sem novo schema. Derrubar o MySQL no meio (`docker stop koovela-mysql` e subir de novo) e repetir → termina `active`. Forçar 3 falhas (`--inject-failure 3`) → `provisioning_failed` e alerta.

## 3. Migração multi-schema, canário e falha isolada (História 2)

```bash
pnpm koovela tenant seed --count 50                       # local ou staging
pnpm koovela migrate --domain platform --plan             # mostra canário e alvo
pnpm koovela load --rps 20 &                              # gerador de carga de leitura e escrita
pnpm koovela migrate --domain platform --inject-failure-tenant <id>
```

Esperado: canário (5%, mínimo 1) primeiro; depois os demais; o tenant injetado fica `migration_pending` com `error_code` e os outros 49 migram; o gerador de carga não registra erro. `pnpm koovela migrate --reprocess <run_id>` migra só o pendente. Iniciar uma segunda execução durante a primeira → recusada (`tenancy.migration_run_in_progress`). `pnpm koovela migrate --rollback <run_id>` reverte na ordem inversa; rollback de `contract` aplicada → recusado.

## 4. Isolamento (História 3)

```bash
pnpm test:isolation
```

Esperado: com os tenants A e B, todo caso "contexto de A → recurso de B" responde 404; conexão sem contexto → `tenancy.context_missing`; tenant suspenso → `tenancy.tenant_suspended`. Um PR que importe `mysql2` ou use `withSchema` fora de `packages/platform` falha no lint.

## 5. Ciclo de vida (História 5)

```bash
pnpm koovela tenant transition <id> --to suspended --reason "teste"
pnpm koovela tenant transition <id> --to archived  --reason "teste"
pnpm koovela tenant transition <id> --to active    --reason "teste"   # recusado (arquivado → ativo)
pnpm test:property --filter tenancy-state-machine
```

Esperado: transições permitidas registradas em `tenant_state_transition` com evento no outbox; proibidas recusadas com `tenancy.transition_not_allowed`.

## 6. Tela G03 no back-office (História 4)

Abrir `http://admin.koovela.localhost/schemas` (em staging, `https://admin.staging.koovela.com/schemas` com Cloudflare Access + MFA). Conferir lista com filtros por estado e versão, andamento da execução, detalhe de falha sem dado de negócio, e reprocessar um tenant pela tela informando justificativa; conferir a linha em `ops_action_log`.

## 7. Restauração de um tenant (História 7, staging)

```bash
pnpm koovela tenant restore <id> --point "2026-12-01T13:37:00-03:00"
pnpm koovela tenant restore approve <restore_id> --justification "teste de restauração"
```

Esperado: espaço `r_<hex32>_<ts>` criado sem tocar nos outros tenants; após aprovação, o tenant fica suspenso por instantes, troca de tabelas, volta `active`; tudo em até 4 horas; cópias removidas em até 7 dias.

## 8. Verificação diária e alertas

`pnpm koovela tenant verify` → zero desvios. Revogar à mão um grant de `svc_platform` num tenant e rodar de novo → desvio registrado e corrigido. Alertas de REQ-TEN-053 conferidos com `pnpm ops:alert-test --rule tenancy.*`.
