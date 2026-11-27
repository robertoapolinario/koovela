# ServiceUnhealthy — processo sem saúde

**Severidade**: crítico · **Fonte**: `infra/observability/alerts/`

## O que significa

O Traefik do host de aplicação marcou um processo (gateway ou web) como fora do ar por 2 minutos.

## Primeiros 10 minutos

1. Grafana → painel *Serviços*: veja qual processo e desde quando.
2. No host (`cloudflared access ssh --hostname ssh-app.koovela.com`): `docker compose -f /opt/koovela/infra/compose/app-host.yml ps` e `logs --tail 200 <processo>`.
3. Se começou logo depois de um deploy, rode o rollback (`docs/ops/runbooks/deploy-promocao-rollback.md`).
4. Se o `/v1/health` aponta uma dependência (mysql, redis, rabbitmq), siga para o host de dados.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
