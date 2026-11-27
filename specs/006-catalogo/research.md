# Research: Catálogo (006)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 001–005 (schema por tenant, auditoria por outbox, flags, mídia em `cdn.koovela.com`, `price_display` do negócio). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: domínio `catalog` (CONST 4.4), tabelas `catalog_*` no schema do tenant; sugestões de serviço por vertical em `koovela_platform.catalog_service_suggestion` (global, mantida pela Gestão). Saldo de sessões de pacote fica no `payments` (spec 012, REQ-CAT-042); aqui só a definição do pacote.

## R2. Versionamento de preço e composição

- **Decisão**: entidades estáveis (`catalog_service`, `catalog_combo`, `catalog_package`) + tabelas de versão imutáveis (`*_version`) com `valid_from` (instante UTC) e `superseded_at`. Mudança com vigência futura cria versão `scheduled`; duas mudanças com a mesma vigência substituem a agendada antes de valer (edge case), mantendo o histórico. Preço por filial também versionado (`catalog_branch_price_version`). Contratos: "versão vigente em T" e "versão por id" (REQ-CAT-021), consumidos pela spec 009 para congelar no agendamento (CONST III).
- **Por quê**: congelamento exige que a versão referenciada nunca mude; versões imutáveis tornam isso garantido por construção.
- **Alternativas**: tabela única com histórico por *trigger* (consultas de "vigente em T" mais caras e propensas a erro).

## R3. Dinheiro

- **Decisão**: `amount_cents BIGINT` + `currency CHAR(3) = 'BRL'`; tipo `Money` de `packages/platform/money` em toda a camada (lint proíbe `number` em dinheiro). Entrada com fração de centavo recusada (REQ-CAT-002). "A partir de": `price_kind = from` com `amount_cents` = mínimo (REQ-CAT-005).

## R4. Rateio do desconto do combo

- **Decisão**: `desconto = soma dos avulsos − preço do combo`; por etapa, `floor(desconto × preço_etapa / soma)`; o resto do arredondamento vai para a **última etapa** (REQ-CAT-034). Calculado e congelado na versão do combo (`catalog_combo_step.discount_share_cents`). Teste de propriedade: a soma dos rateios é sempre igual ao desconto, para qualquer combinação.

## R5. Combo para o motor de agenda

- **Decisão**: contrato `GET /v1/internal/catalog/combos/{id}/plan?branch_id=&at=` devolve etapas ordenadas com duração, preparo (só antes da 1ª), limpeza (só depois da última), intervalo e `professional_rule = same_for_all` (REQ-CAT-031/032). Modelo já tem `professional_rule` enum com `per_step` (fase 2, `[D34]`) e `catalog_combo_step_candidate` vazio na v1.0 (REQ-CAT-035).

## R6. Disponibilidade por filial e permissões do Gerente

- **Decisão**: `catalog_service_branch` (disponível + preço próprio opcional versionado). Padrão: disponível em todas as filiais ativas, inclusive as criadas depois (flag `all_branches`). Gerente: cria serviço com `all_branches = false` e só a própria filial; ajusta preço e disponibilidade da própria filial; não altera preço padrão (matriz RBAC, `allow_scoped`).

## R7. Clonagem de filial

- **Decisão**: consumidor de `tenancy.branch.cloned.v1` (spec 005) copia `catalog_service_branch` e preços próprios da origem para a nova filial, idempotente por `(source, target)` (REQ-CAT-011).

## R8. Pacote de sessões e a regra de saúde

- **Decisão**: `catalog_package` + versão (serviço ou combo, 2–50 sessões, preço total, validade 30–730 dias, abrangência `purchase_branch` \| `all_branches`, regra de devolução). A compra (spec 012) congela a versão. Regra de devolução: mínimo legal (integral em até 7 dias da compra pela internet sem sessão usada, CDC art. 49) sempre aplicado; depois, regra do tenant (`none` \| `proportional_unused` \| `proportional_minus_fee`), exibida antes da compra (REQ-CAT-044).
- **Saúde (PEN-06)**: como o preço nunca aparece, **pacotes de negócios de saúde não são vendidos pelo app nem pela web**; são cadastrados no painel e vendidos pela Recepção no local (registro de pagamento no local, spec 012). O consumidor vê no app só o saldo e a validade do pacote que já comprou.
- **Alternativas**: mostrar preço do pacote só depois de logado (continua sendo divulgação de preço; contraria a decisão).

## R9. Exibição ao consumidor

- **Decisão**: `GET /v1/public/businesses/{slug}/catalog?branch_id=` (tenant pelo slug no gateway) com grupos, serviços, combos e pacotes públicos e disponíveis, preço formatado ou `price_display = never` (sem campo de preço no JSON em saúde, não só escondido na tela), economia de combo e pacote, e fotos com `srcset`. SSR na página pública (spec 005) e cache na Cloudflare com *purge* em `catalog.*.changed`. 3G: texto primeiro, fotos com `loading=lazy` e *placeholder* de cor dos tokens (REQ-CAT-052).

## R10. Sugestões por vertical e importação

- **Decisão**: sugestões (nome, descrição curta, duração típica, sem preço) semeadas por categoria da DF 4.1 e editáveis no back-office; no O03, o Proprietário marca as que quer e informa o preço. "Importar de outro negócio do mesmo Cliente" copia como serviços novos e independentes (edge case).

## R11. Prontidão de publicação

- **Decisão**: publicar o primeiro serviço público ativo com preço (ou em saúde, sem preço exibido) emite `catalog.service.published.v1`, consumido pela prontidão da spec 005.

## R12. Telas (Figma)

| Superfície | Tela | Código |
|---|---|---|
| Painel (onboarding) | Serviços e preços | O03 |
| Painel | Serviços e preços · Combos · Pacotes de sessões | P12 · P13 · P14 |
| App do consumidor | Página do estabelecimento (lista) · Detalhe do serviço | C04 · C05 |
| Web do consumidor | Página do estabelecimento · Detalhe do serviço | W07 · W08 |
