# Deploy, promoção e rollback (US3)

## Fluxo normal

1. **Merge na `main`** → `deliver.yml` constrói as imagens `linux/arm64` (runner ARM nativo), publica no GHCR por
   digest, gera SBOM CycloneDX, assina com cosign keyless e publica o `release.json` no GitHub Release da versão
   `AAAA.MM.DD-sha7`.
2. O job `deploy-staging` entra no `app-stg-01` pelo túnel (Cloudflare Access com token de serviço) e roda
   `koovela-deploy --env staging --manifest release.json`. O host:
   - verifica a assinatura de **cada** imagem com a identidade do `deliver.yml@refs/heads/main`;
   - faz `pull` por digest e sobe processo a processo;
   - espera `/v1/health` = `ok`/`degraded` (até 5 min); se falhar, volta sozinho para a versão anterior e alerta.
3. **Promover**: Actions → `promote` → informe a versão. O environment `production` pede aprovação de um revisor.
   O workflow confere que a versão está saudável em staging, reaproveita o **mesmo** `release.json` (sem rebuild)
   e grava `approved_by`.

Cada passo fica em `/var/lib/koovela/deploys.jsonl` no host e nos *Deployments* do GitHub.

## Rollback (meta ≤ 10 min)

- Pelo GitHub: Actions → `rollback` → escolha o ambiente.
- No host (emergência, via `cloudflared access ssh`): `sudo koovela-deploy --env production --rollback`.

O rollback volta para `previous_version` guardada no host. Migrações seguem expandir → migrar → contrair, então
a versão anterior continua compatível com o banco.

## Falhas comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| `assinatura cosign inválida` | imagem não veio do `deliver.yml` da `main` | não force; descubra a origem da imagem |
| `outro deploy em andamento` | trava em `/var/lib/koovela/deploy.lock` | confirme que não há deploy rodando (`ps`), depois `rm -r` a trava |
| `readiness falhou` | versão nova sem saúde | já revertida; veja os logs no Grafana pelo `correlation_id` |
| `produção exige --approved-by` | promoção sem aprovação | use o workflow `promote` |

## Configuração inicial (uma vez por ambiente)

- Environments no GitHub: `staging`, `staging-rollback`, `production` (com *required reviewers*), `production-rollback`.
- Segredos dos environments: `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `DEPLOY_SSH_KEY`.
- Variáveis: `DEPLOY_SSH_HOST` (ex.: `ssh-app-stg.koovela.com`), `DEPLOY_SSH_KNOWN_HOSTS`.
