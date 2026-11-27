# Tempo do pipeline (p90)

Metas: PR ≤ 15 min (p90, US2); merge → staging saudável ≤ 20 min (SC-005, US3).

Como medir: `gh run list --workflow pr.yml --limit 10 --json databaseId,createdAt,updatedAt,conclusion`
nos 10 PRs mais recentes de um mesmo domínio; para staging, do `push` na `main` até o status `succeeded`
do deployment `staging`.

## PR (10 execuções)

| Data | PR | Duração (min) |
|---|---|---|

p90: _a medir após os primeiros 10 PRs_

## Merge → staging (10 merges)

| Data | Commit | Duração (min) |
|---|---|---|

p90: _a medir após a US3 estar em operação_
