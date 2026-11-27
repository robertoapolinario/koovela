# Lint de spec local (CONST VI, REQ-FND-012)

As specs ficam fora do repositório público (`specs/` está no `.gitignore`), por isso o lint roda só localmente:

1. **pre-commit** (lefthook): `pnpm spec:lint` em todo commit. Instale os hooks com `pnpm exec lefthook install`.
   Commitar com o hook desativado é violação da constituição.
2. **antes de cada `/speckit-plan`**: hook `before_plan` obrigatório em `.specify/extensions.yml`, que chama a
   skill local `.claude/skills/speckit-spec-lint/SKILL.md` (roda `pnpm spec:lint --spec <feature_directory>`).

Os dois arquivos (`.specify/extensions.yml` e a skill) são locais. Em uma máquina nova, recrie-os com o conteúdo abaixo.

`.specify/extensions.yml`:

```yaml
hooks:
  before_plan:
    - extension: spec-lint
      command: speckit.spec-lint
      description: Lint de spec (CONST VI) — bloqueia o plano se a spec violar a CONST 9.2
      optional: false
      enabled: true
```

A skill está em `.claude/skills/speckit-spec-lint/SKILL.md` (copie de outra máquina ou do backup local).

Regras verificadas: fase, superfícies, seções obrigatórias da CONST 9.2, origem por requisito, PEN bloqueante
sem decisão e `[NEEDS CLARIFICATION]` fora da linha `**Input**`.
