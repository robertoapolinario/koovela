# Quickstart de validação: Auditoria e feature flags (004)

Pré-requisitos: ambiente das specs 001 a 003 (`pnpm koovela up`, tenants sintéticos, contas de equipe e da Gestão). Contratos em [contracts/](./contracts/), tabelas em [data-model.md](./data-model.md).

## 1. Toda ação obrigatória vira registro (História 1)

```bash
pnpm test --filter audit-coverage      # um teste por ação com audit_category na matriz
```

Esperado: cada endpoint auditável gera exatamente um registro no outbox; tentativa negada também. Manual: como Proprietária, convidar uma Recepção; em até 30 s, `GET /v1/admin/audit/records?action=team.invite` (como SRE) mostra o registro com todos os campos de [audit-record.schema.json](./contracts/audit-record.schema.json). Repetir a ação com a mesma `Idempotency-Key` → nenhum registro novo. Forçar falha no outbox (`--inject-failure audit_outbox`) → a ação é desfeita.

Migração dos provisórios: `pnpm koovela migrate --domain backoffice` → os registros antigos de `ops_action_log` (002) e `privileged_action_log` (003) aparecem na trilha na ordem original.

## 2. Integridade (História 2)

```bash
pnpm koovela audit verify --date today
mysql -u root koovela_platform -e "UPDATE backoffice_audit_log SET justification='x' WHERE seq=42"   # só como root, em dev
pnpm koovela audit verify --date today
```

Esperado: a primeira verificação passa e grava o selo no R2 (em dev, MinIO local); a segunda aponta `seq=42` como primeiro inconsistente e dispara o alerta crítico `audit_chain_broken`. Com o usuário `svc_backoffice_audit`, `UPDATE` e `DELETE` são recusados.

## 3. Pesquisa e exportação (História 3)

No back-office (tela **G10**): como SRE, pesquisar 90 dias por tenant e ação → resposta em até 5 s; como Fin/Ops, só aparecem categorias financeiras; como Suporte, só os próprios registros e os das próprias sessões. Exportar com justificativa → link de 24 h com CSV + JSON de prova; a consulta e a exportação aparecem como registros `audit_access`. IP completo só para SRE.

Painel do Proprietário: `http://painel.koovela.localhost/configuracoes/auditoria` mostra ações da equipe e das sessões de suporte do próprio tenant, com filtros.

## 4. Flags por tenant sem deploy (História 4)

1. Declarar `platform.example_banner` em `packages/contracts/flags/flags.yaml` e fazer deploy local (`pnpm koovela up`).
2. Na tela **G09**, ligar para a lista de inclusão com o tenant sintético 1.
3. Em até 60 s, a faixa aparece no painel e no app do tenant 1 e não no tenant 2; página pública `koovela.localhost/<slug-do-tenant-1>` também mostra.
4. Porcentagem de 50%: `pnpm koovela flags simulate platform.example_banner --tenants 100` → sempre os mesmos tenants dentro.
5. Parar o `core` e o Redis: clientes continuam com o último valor; app reinstalado sem rede usa o `safe_value`.
6. Acionar o interruptor `payments.checkout_kill` → checkout indisponível em todos os tenants em ≤ 60 s, anotação no Grafana.

## 5. Mudança controlada (História 5)

Como Suporte, tentar mudar uma flag → 403. Como SRE em produção (staging simulando): pedir com `dry_run` → número de tenants afetados; mudar com justificativa e step-up; mudar de novo com `If-Match` antigo → 409. Reverter para a versão 1 num passo; histórico e trilha mostram valor anterior e novo.

## 6. Higiene (História 6)

```bash
pnpm koovela flags hygiene        # roda a verificação semanal
pnpm flags:check                  # no CI: código × definição
```

Flag com `remove_by` vencido há mais de 30 dias → PR que toca o código dela falha; chave usada no código e ausente do `flags.yaml` → falha; testes com `withFlag()` rodam com a flag ligada e desligada.
