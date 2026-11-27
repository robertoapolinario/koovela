# FreeTierUsageHigh — plano gratuito em 80%

**Severidade**: warning · **Fonte**: `infra/observability/alerts/`

## O que significa

O uso de um plano gratuito (Cloudflare, Access, R2, Sentry, Resend, ntfy) passou de 80% (REQ-FND-048).

## Primeiros 10 minutos

1. Grafana → *Planos gratuitos*: qual serviço e a tendência.
2. Reduza o consumo (ex.: amostragem de erros no Sentry, retenção no R2).
3. Se o crescimento é estrutural, leve a decisão de custo antes de passar do limite (`docs/ops/decisions/servicos-gratuitos.md`).

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
