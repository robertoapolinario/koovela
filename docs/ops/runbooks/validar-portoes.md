# Validar os portões de PR

Quando: depois de mudar `.github/workflows/pr.yml` ou os rulesets da `main`, e uma vez por trimestre.

1. Para cada linha de `.github/test-fixtures/gates/README.md`, crie um branch `999-gate-<n>` a partir da `main`.
2. Faça a mudança descrita e abra o PR (rascunho).
3. Confirme que o job indicado falha com a mensagem esperada e que o botão de merge está bloqueado.
4. Feche o PR sem merge e apague o branch.
5. Abra um PR limpo e confirme que todos os jobs passam em ≤ 15 min (p90, ver `docs/ops/decisions/pipeline-p90.md`).
6. Registre a data e o resultado no fim deste arquivo.

## Registro

| Data | Executor | Resultado |
|---|---|---|
