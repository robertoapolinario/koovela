# HighLatency — p95 acima de 500 ms

**Severidade**: warning · **Fonte**: `infra/observability/alerts/`

## O que significa

O p95 de latência de um serviço passou de 500 ms por 10 minutos (meta da CONST 6).

## Primeiros 10 minutos

1. Grafana → *Serviços*: quais rotas.
2. Tempo: traces mais lentos da rota; procure consultas ao banco demoradas.
3. Grafana → *Hosts*: CPU, memória e disco do host de dados.
4. Abra tarefa de performance se não for pontual.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
