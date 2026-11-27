# DiskAbove80 — disco acima de 80%

**Severidade**: crítico · **Fonte**: `infra/observability/alerts/`

## O que significa

Um sistema de arquivos de um host passou de 80% de uso.

## Primeiros 10 minutos

1. `df -h` e `du -xh / | sort -h | tail` no host.
2. Suspeitos: logs de contêiner (`docker system df`), imagens antigas (`docker image prune -a` só de imagens sem uso), WAL do Prometheus/Loki, binlogs.
3. Nunca apague binlogs manualmente: o backup depende deles (RPO).
4. Se for crescimento real, planeje o volume (Always Free tem 200 GB por conta).

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
