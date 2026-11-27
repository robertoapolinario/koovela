# Rulesets da `main` (REQ-FND-011)

A fonte é `infra/github/rulesets/main.json` (o provider OpenTofu do GitHub não cobre todos os campos de ruleset
usados aqui, por isso o JSON é aplicado pela API).

- PR obrigatório, histórico linear, sem force-push nem exclusão;
- todos os jobs de `pr.yml` obrigatórios, com o branch atualizado;
- **nenhum bypass**, nem para administradores (`bypass_actors: []`);
- commits assinados.

## Aplicar ou atualizar

Requer `gh` autenticado como administrador do repositório.

```sh
# criar
gh api -X POST repos/{owner}/{repo}/rulesets --input infra/github/rulesets/main.json
# atualizar (id em: gh api repos/{owner}/{repo}/rulesets)
gh api -X PUT repos/{owner}/{repo}/rulesets/<id> --input infra/github/rulesets/main.json
```

Depois de aplicar, rode o roteiro de `validar-portoes.md` (linha 16: push direto na `main` deve ser recusado).
