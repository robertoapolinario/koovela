# spec-lint

Lint das specs locais (`specs/`, fora do repositório público): fase, superfícies, seções obrigatórias da
CONST 9.2, origem por requisito, PEN bloqueante sem decisão e `[NEEDS CLARIFICATION]`.
Roda no pre-commit (lefthook) e antes de cada `/speckit-plan`. Sem `specs/`, sai com 0.

```sh
pnpm spec:lint                         # todas
pnpm spec:lint --spec specs/008-motor  # uma só
```
