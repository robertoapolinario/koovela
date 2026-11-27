# HighErrorRate — mais de 5% de 5xx

**Severidade**: crítico · **Fonte**: `infra/observability/alerts/`

## O que significa

Mais de 5% das respostas de um serviço foram 5xx nos últimos 5 minutos.

## Primeiros 10 minutos

1. Grafana → *Serviços*: rota e código mais frequentes.
2. Loki: `{service_name="<serviço>"} | json | level="error"`; pegue um `correlation_id` e abra o trace no Tempo.
3. Sentry: erro novo desde a última versão? Se sim, rollback.
4. Dependência fora? Veja `/v1/health`.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
