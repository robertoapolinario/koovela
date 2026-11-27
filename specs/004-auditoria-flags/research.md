# Research: Auditoria e feature flags (004)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 001 (observabilidade, R2, OCI Vault), 002 (executor, `koovela_platform`, resolvedor), 003 (`authz`, step-up, sessões de suporte). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: domínio `backoffice` (CONST 4.4: "flags… auditoria consolidada"). Trilha e flags em `koovela_platform` (tabelas `backoffice_*`), com a biblioteca `packages/platform/audit` e `packages/platform/flags` usadas por todos os domínios.
- **Por quê**: auditoria e flags atravessam tenants; ficam no espaço global, com `tenant_id` como campo indexado (REQ-AUD-015).

## R2. Atomicidade sem violar a fronteira de domínio

- **Decisão**: **outbox de auditoria por domínio**. Cada domínio grava o registro numa tabela própria (`<domínio>_audit_outbox`, no mesmo schema e na **mesma transação** da ação — dentro do tenant ou no espaço global do domínio). Um ingestor único no `workers` lê os outboxes (pelo resolvedor da 002, tenant a tenant e global), deduplica por `audit_id` (gerado de forma determinística a partir da chave de idempotência quando houver, REQ-AUD-004) e anexa à trilha central encadeada. Ação sem registro = transação desfeita (REQ-AUD-003).
- **Por quê**: gravar direto na tabela do `backoffice` de dentro da transação de outro domínio quebraria o Princípio VII; o outbox local é atômico e custa só um `INSERT` (≪ 50 ms, REQ-AUD-028).
- **Alternativas**: chamada HTTP ao `backoffice` na ação (não atômica); gravar no RabbitMQ (perde atomicidade com o estado).
- **Consequência**: a trilha central fica alguns segundos atrás da ação (meta: ≤ 30 s p95); a tela mostra "atualizado até HH:MM:SS".

## R3. Encadeamento e prova de integridade

- **Decisão**: um único escritor (o ingestor) anexa registros em ordem com `seq` crescente e `hash = SHA-256(prev_hash ‖ JSON canônico do registro)` (JSON canônico pela RFC 8785). Usuário `svc_backoffice_audit` só com `INSERT, SELECT` (REQ-AUD-010); nenhum outro usuário de aplicação tem `UPDATE`/`DELETE`. Verificação diária recalcula a cadeia do dia e grava o **selo** (`dia, seq_inicial, seq_final, quantidade, hash_final, raiz de Merkle`) em **Cloudflare R2 com bucket lock** (retenção imutável de 5 anos), fora do banco e fora da OCI (REQ-AUD-012). Quebra → alerta crítico com o primeiro `seq` inconsistente. Selo não gravado → nova tentativa por hora, alerta após 24 h.
- **Por quê**: cadeia de hashes detecta alteração, remoção e reordenação; o selo externo impede reescrever a cadeia inteira sem que se perceba.
- **Alternativas**: tabela com *triggers* que impedem `UPDATE` (o DBA ainda pode desligar); serviço de carimbo de tempo externo pago.

## R4. Volume, retenção e consulta

- **Decisão**: `backoffice_audit_log` particionada por mês (`RANGE` em `seq` com mapa mês → faixa), índices `(tenant_id, occurred_at)`, `(actor_id, occurred_at)`, `(action, occurred_at)`, `(correlation_id)`, `(support_session_id)`. Retenção 5 anos (REQ-AUD-020): partições com mais de 5 anos são removidas em bloco por procedimento registrado, mantendo os selos. Consultas de até 90 dias síncronas (≤ 5 s p95); acima disso, assíncronas (job no `workers`, aviso na tela). Exportação: CSV + JSON de prova (registros com hashes, selos do intervalo), link assinado do R2 por 24 h, com justificativa (REQ-AUD-025).
- **Estimativa**: até ~10 milhões de registros/ano na escala inicial; MySQL particionado atende.

## R5. Dados pessoais na trilha

- **Decisão**: a trilha guarda só identificadores (`actor_id`, `target_id`); nomes e e-mails para exibição ficam em `backoffice_audit_subject` (cifrados, apagáveis ou anonimizáveis pela spec 022 sem tocar na cadeia, REQ-AUD-014). IP completo guardado; exibido truncado fora do SRE (REQ-AUD-026). Justificativa com aviso na tela para não incluir dado de terceiro.

## R6. Catálogo de ações auditáveis e teste de cobertura

- **Decisão**: a matriz `packages/contracts/rbac/permissions.yaml` (spec 003) ganha `audit_category` (`management` \| `financial` \| `support` \| `tenant_admin`) e `justification_required` por ação. Gerador de testes: para cada operação do OpenAPI cuja ação tenha `audit_category`, um teste de integração chama o endpoint e confere exatamente um registro no outbox (REQ-AUD-006); também confere o registro de tentativa negada (REQ-AUD-005).

## R7. Migração dos registros provisórios

- **Decisão**: migração única (fase `migrate`) que lê `ops_action_log` (002) e `privileged_action_log` (003) em ordem de `occurred_at` e os envia à trilha pelo ingestor, mantendo a ordem e marcando a origem; depois, `tenancy` e `identity` passam a gravar no próprio `*_audit_outbox`, e as tabelas provisórias viram somente leitura até a fase `contract`.

## R8. Visão do Proprietário

- **Decisão**: `GET /v1/tenant/audit` no gateway, com o `tenant_id` da credencial (nunca do cliente), filtros por pessoa, ação, filial e período; mostra as ações da equipe e das sessões de suporte (REQ-AUD-027, clarify). Tela nova no painel (sem código no Figma; ver Riscos), acessível a partir de "Configurações" (P26).

## R9. Feature flags: definição no código, regras no back-office

- **Decisão**:
  - **Definição** em `packages/contracts/flags/flags.yaml` (chave, descrição, responsável, tipo `release` \| `kill_switch` \| `ops`, valor seguro, data de remoção obrigatória para `release`). É o que o CI usa para conferir "flag citada no código e ausente do cadastro" e as vencidas (REQ-FLG-014), e gera tipos TypeScript (`flags.isEnabled('scheduling.combo_swap')` só aceita chaves existentes).
  - **Regras e valores por ambiente** no banco (`backoffice_feature_flag`, versionado), editados na tela **G09**. O deploy sincroniza as definições: chave nova aparece desligada; chave removida do código vira `removed`.
  - Avaliação compatível com **OpenFeature** (padrão aberto da CNCF): provedor próprio em `packages/platform/flags`, sem serviço externo.
- **Por quê**: o cadastro precisa estar no repositório para o CI, e as regras precisam mudar sem deploy (REQ-FLG-005).
- **Alternativas**: Unleash ou Flagsmith auto-hospedados (mais um serviço com banco próprio no host de dados; fere XII); GrowthBook Cloud (conta externa).

## R10. Avaliação, propagação e falha

- **Decisão**:
  - Precedência fixa (REQ-FLG-002): interruptor desligado > exclusão > inclusão > vertical > porcentagem > padrão do ambiente.
  - Porcentagem determinística: `bucket = SHA-256(flag_key ‖ salt_da_versão_da_regra ‖ tenant_id) mod 10000` (REQ-FLG-003); o `salt` só muda se o SRE pedir "re-sortear".
  - Serviços: snapshot em memória, atualizado pelo evento `backoffice.feature_flag.changed.v1` e por *polling* de 30 s ao Redis (`flags:snapshot:<env>` com versão) — propagação ≤ 60 s (REQ-FLG-005).
  - Web e apps: `GET /v1/flags` devolve as flags já avaliadas para o contexto (tenant da credencial ou do slug da página; sem tenant, regra global — REQ-FLG-004), com `ETag`; *polling* de 60 s e ao voltar ao primeiro plano; último valor guardado (localStorage / MMKV) e valor seguro como último recurso (REQ-FLG-006). App do colaborador atualiza antes da primeira escrita ao reconectar.
  - Vertical: lida da projeção de negócio (spec 005); até lá, fixture.
- **Por quê**: sem serviço novo; 60 s cabe na meta com folga.

## R11. Mudança controlada

- **Decisão**: só SRE (`flag.change` na matriz); em produção, justificativa + step-up ≤ 5 min (REQ-IDN-022) + pré-visualização do número de tenants afetados; concorrência otimista por `version` (REQ-FLG-010); histórico completo e "voltar para a versão N" num passo (REQ-FLG-009); cada mudança no outbox de auditoria do `backoffice` com valor anterior e novo e no evento `backoffice.feature_flag.changed.v1`. Interruptor acionado aparece no Grafana (anotação) e gera aviso.

## R12. Higiene das flags

- **Decisão**: tarefa semanal no `workers` marca `expired` (data de remoção passada) e `unused` (sem avaliação há 30 dias, pela métrica agregada `flags_evaluations_total`), avisa o responsável; o CI falha PRs que tocam o código de uma flag `release` vencida há mais de 30 dias (REQ-FLG-014). Testes de funcionalidades com flag rodam ligado e desligado por um *helper* (`withFlag(key, [true,false])`, REQ-FLG-013).

## R13. Relógio

- **Decisão**: `chrony` em todos os hosts com servidores NTP públicos; métrica `node_timex_offset_seconds`; alerta se a diferença passar de 1 s (edge case). A ordem oficial da trilha é o `seq`, não o horário.

## R14. Telas

| Superfície | Tela | Código Figma |
|---|---|---|
| Back-office | Trilha de auditoria | **G10** |
| Back-office | Feature flags | **G09** |
| Painel do cliente | Trilha do próprio tenant | Sem tela no protótipo |
