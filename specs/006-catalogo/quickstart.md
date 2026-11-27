# Quickstart de validação: Catálogo (006)

Pré-requisitos: specs 001–005 no ar; tenant sintético com negócio de beleza (2 filiais) e outro de saúde. Contratos em [contracts/](./contracts/).

## 1. Serviços (História 1)

No O03/P12: escolher sugestões da vertical, informar preços; criar "Corte feminino" 60 min, preparo 5, limpeza 10, R$ 120,00. Duração 62 → recusada (múltiplo de 5); R$ 120,005 → recusado. Publicar o primeiro serviço → evento `catalog.service.published.v1` e a prontidão da spec 005 marca "serviço publicado".

## 2. Preço por filial e Gerente (História 2)

Filial 2 com preço próprio R$ 140,00; Gerente da filial 2 altera o preço da filial 2 (ok), tenta o padrão ou a filial 1 (negado). Clonar a filial 1 (spec 005) → a nova herda disponibilidade e preços próprios.

## 3. Versão congelada (História 3)

```bash
pnpm test --filter catalog -- versioning
```

Mudar o preço com vigência amanhã → `GET /v1/internal/catalog/services/{id}/version?at=hoje` devolve a versão antiga e `at=amanhã` a nova; `GET /v1/internal/catalog/versions/{id}` sempre devolve a mesma versão. Mudança registrada na trilha (spec 004).

## 4. Combo (História 4)

Combo "Corte + Escova" (R$ 120 + R$ 80, combo R$ 180, intervalo 5 min) → rateio R$ 12 / R$ 8 (resto na última). `pnpm test:property --filter combo-discount` → soma dos rateios = desconto sempre. Preço acima da soma → recusado. `GET /v1/internal/catalog/combos/{id}/plan` → preparo só na 1ª etapa, limpeza só na última. Desativar a escova → combo inativo com aviso.

## 5. Pacote (História 5)

Pacote de 10 sessões de fisioterapia (negócio de saúde) → `sell_channel = on_site_only`, sem preço na página pública. Pacote de 5 "Escova" (beleza) → aparece com sessões, validade, economia e regra de devolução (mínimo legal de 7 dias sem sessão usada sempre presente).

## 6. Consumidor (História 6)

`http://koovela.localhost/<slug>` e detalhe (C05/W08): grupos, duração, preço, economia; no negócio de saúde, o JSON de `GET /v1/public/businesses/{slug}/catalog` não traz nenhum campo de preço. Lighthouse em 3G simulado: texto antes das fotos; axe sem violações AA.
