# DeadLetterGrowing — DLQ crescendo

**Severidade**: warning · **Fonte**: `infra/observability/alerts/`

## O que significa

Mensagens estão caindo numa fila morta (`*.dlq`) depois de esgotar as tentativas.

## Primeiros 10 minutos

1. Grafana → *Filas*: qual DLQ e desde quando.
2. RabbitMQ (pelo túnel): leia uma mensagem da DLQ **sem** consumir; o `x-correlation-id` leva aos logs.
3. Corrija a causa (deploy ou dado inválido) e reprocesse movendo da DLQ para a fila original com o shovel do management.
4. Nunca apague mensagens da DLQ sem registrar o motivo.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
