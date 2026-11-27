# PRs-violação: um por portão (US2)

Cada linha descreve a mudança mínima que deve **bloquear** o PR e a mensagem esperada do job.
Use para validar os portões depois de mudar `pr.yml` ou os rulesets (roteiro em
`docs/ops/runbooks/validar-portoes.md`). As mudanças são feitas num branch descartável e o PR é fechado sem merge.

| # | Portão | Mudança do PR-violação | Job · mensagem esperada |
|---|---|---|---|
| 1 | lint | `const a: any = 1` num arquivo de `packages/` | `quality` · `@typescript-eslint/no-explicit-any` |
| 2 | dinheiro | `type T = { priceCents: number }` | `quality` · `koovela/no-number-money` |
| 3 | design | `color: '#B5532F'` num componente de `apps/` | `quality` · `koovela/no-raw-design-values` |
| 4 | tipos | chamar `money(10)` | `quality` · `TS2345` |
| 5 | unidade | quebrar `allocate` em `packages/platform/money` | `quality` · teste `allocate não perde centavos` |
| 6 | integração | remover `INSERT IGNORE` de `processOnce` | `integration` · teste de idempotência |
| 7 | arquitetura | `services/gateway` importar `services/platform/src/domain.ts` | `quality` · `no-cross-domain` |
| 8 | env | `process.env.NOVA_CHAVE` sem rodar `pnpm env:generate` | `quality` · `NOVA_CHAVE usada em … ausente do .env.example` |
| 9 | contrato | remover `version` de `Health` sem nova versão | `quality` · `contracts:breaking` |
| 10 | segredos | arquivo com chave AWS de exemplo (`AKIA…` de teste) | `security` · `gitleaks` |
| 11 | dependências | fixar dependência com CVE crítica conhecida | `security` · Trivy `CRITICAL` |
| 12 | a11y | botão sem nome acessível num shell | `a11y` · `button-name` |
| 13 | ARM64 | dependência nativa sem binário `linux/arm64` | `images` · erro do build |
| 14 | mensagens | commit `atualiza coisas` | `quality` · commitlint `subject-empty`/`type-empty` |
| 15 | branch | branch `feature/x` | `quality` · `fora do padrão NNN-nome` |
| 16 | proteção | push direto na `main` | ruleset · `Changes must be made through a pull request` |
