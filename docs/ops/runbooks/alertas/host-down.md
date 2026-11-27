# HostDown — host sem métricas

**Severidade**: crítico · **Fonte**: `infra/observability/alerts/`

## O que significa

O Prometheus não coleta o node-exporter de um host há 3 minutos.

## Primeiros 10 minutos

1. Console da OCI: estado da instância.
2. Tente o SSH pelo túnel; se o túnel também caiu, o host está fora.
3. Reinicie pela console. Se for o host de dados, a aplicação estará sem saúde (alertas inibidos).
4. Registre o incidente.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
