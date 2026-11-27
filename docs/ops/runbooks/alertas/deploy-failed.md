# DeployFailed — deploy falhou

**Severidade**: crítico · **Fonte**: `infra/observability/alerts/`

## O que significa

O último `koovela-deploy` terminou com `failed`. O host volta sozinho para a versão anterior.

## Primeiros 10 minutos

1. Veja `/var/lib/koovela/deploys.jsonl` no host e o job no GitHub Actions.
2. Confirme que a versão anterior está no ar (`/v1/health`).
3. Causa comum: readiness falhou (migração, configuração, segredo). Corrija e faça novo merge.
4. Assinatura inválida nunca é ignorada: investigue a origem da imagem.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
