# RestoreTestStale — teste de restauração atrasado

**Severidade**: warning · **Fonte**: `infra/observability/alerts/`

## O que significa

O último teste de restauração registrado tem mais de 35 dias (REQ-FND-052).

## Primeiros 10 minutos

1. Rode `pnpm ops:restore-test --env staging --point <instante>` ou dispare o job mensal no `nightly.yml`.
2. Registre o resultado em `docs/ops/restore-tests/AAAA-MM.md`.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
