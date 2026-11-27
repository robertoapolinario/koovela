# Research: Vitrine e busca (024)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas: D26 (vitrine), PEN-26 (critérios, pesos e base mínima configuráveis; iniciais: relevância, distância, disponibilidade em 7 dias, avaliação ponderada; região com 15 estabelecimentos em 3 km ou 5 por categoria), PEN-06 (saúde sem preço e sem avaliações públicas; destaque sem preço), participação **opt-in**. Base: 005 (página, slugs reservados, geolocalização), 006 (catálogo e preço "a partir de"), 007 (escalas), 008 (próximo horário livre), 009/010/012 (fluxo de agendamento), 016 (médias públicas), 019 (taxa por agendamento), 022 (privacidade, Koovela controladora). Restrição: custo zero, self-hosted. Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e projeção

- **Decisão**: domínio `discovery` (CONST 4.4) com dados em `koovela_discovery` (global, só dados **públicos** de negócios) e um índice de busca. O índice é **projeção por eventos** de 005 (negócio, filial, página, participação, geolocalização), 006 (serviços, categoria, preço "a partir de"), 007 (profissional com horário), 008 (próximo horário livre), 016 (`rating_summary` da projeção já criada na 016) e 002 (suspensão) — nunca consulta os schemas dos tenants (REQ-VIT-054). Atualização ≤ 15 min (REQ-VIT-033).

## R2. Motor de busca

- **Decisão**: **Meilisearch** (MIT, imagem oficial `linux/arm64`, um container no host de dados) com tolerância a erros de digitação, sinônimos (mantidos pela Gestão), filtros facetados e busca geográfica (`_geoRadius`, `_geoBoundingBox`, ordenação por `_geoPoint`) (REQ-VIT-001/010/011). Um documento por **filial participante**, com campos: nome, categorias, serviços (nomes e sinônimos), geoponto (ou centroide aproximado quando o autônomo oculta o endereço), preço mínimo em centavos (ausente em saúde), nota e contagem públicas (ausentes em saúde ou com avaliações desligadas), próximo horário livre, disponível hoje/amanhã, pagamento online, acessibilidade, `is_new_until`, `is_health`, `home_service` (reservado para a fase 3, sem filtro exposto, REQ-VIT-012).
- **Ordenação**: ranking em duas etapas — Meilisearch faz a recuperação (texto + filtros + raio) e devolve até 200 candidatos; o `discovery` reordena pela **fórmula versionada** do back-office (pesos de relevância textual, distância, disponibilidade em 7 dias, avaliação ponderada bayesiana com prior da categoria; estabelecimento novo usa o prior nos primeiros 60 dias para não ser penalizado) e aplica desempate estável e rotativo (hash do id + semente diária) (REQ-VIT-004/006). Nenhum resultado pago na lista principal (REQ-VIT-005); a explicação dos critérios em linguagem simples é gerada a partir da versão da fórmula.
- **Desempenho**: 10 mil documentos e 100 buscas/s cabem com folga num nó; cache Redis de 60 s para consultas idênticas por célula geográfica (geohash 6) (REQ-VIT-007).
- **Alternativas**: OpenSearch/Elasticsearch (memória demais para as VMs Always Free); Typesense (equivalente, licença GPL); MySQL FULLTEXT + espacial (sem tolerância a erros nem sinônimos bons).

## R3. Localização e privacidade

- **Decisão**: "perto de mim" pede a localização só ao tocar; a coordenada vai na consulta, arredondada a ~100 m, **não é registrada** em log, trace nem banco (campo redigido no logger da 001) (REQ-VIT-002). Alternativa digitada: bairro, cidade ou endereço, geocodificados por base local de municípios e bairros (IBGE) e, para endereço completo, Nominatim self-hosted só se o volume justificar; na v2 inicial, bairro/cidade bastam (sem serviço externo pago). Histórico de buscas só com "lembrar minhas buscas" (padrão desligado), com `HolderDataPort` (022) (REQ-VIT-052). Termos ofensivos ou ilegais bloqueados por lista versionada (reaproveita a da 016) (REQ-VIT-055).

## R4. Saúde e preço

- **Decisão**: documentos de saúde **não têm** campo de preço nem de avaliação; o filtro "faixa de preço" e a ordenação por nota ignoram saúde (sem exclusão: saúde entra pelos demais critérios, com a avaliação substituída pelo prior neutro) (PEN-06, REQ-VIT-003). Teste de contrato garante que nenhuma resposta da vitrine leva preço de saúde.

## R5. Regiões

- **Decisão**: `discovery_region` por cidade/bairro (polígono IBGE) com estado `candidate` → `open` ↔ `closed`; tarefa diária calcula participantes por categoria e indica regiões que atingem a base mínima da versão vigente (15 em 3 km ou 5 por categoria); abrir e fechar é decisão da Gestão, registrada (REQ-VIT-040). Ao abrir, convites aos Proprietários elegíveis da região (011) (REQ-VIT-030). Fora de região aberta, a busca mostra os mais próximos participantes e oferece "avise-me quando abrir" (inscrição com o contato da conta, revogável) (REQ-VIT-041).

## R6. Participação (opt-in)

- **Decisão**: estados `not_participating` → `invited` → `pending` → `active` ↔ `paused` · `active` → `left` \| `removed` (REQ-VIT-030 e Regras). Requisitos verificados por contrato (foto de capa, ≥ 3 serviços com preço — ou regra de saúde —, horário, endereço geolocalizado, ≥ 1 profissional com horário), com lista do que falta e prévia do cartão do resultado (REQ-VIT-031). Pausa automática: despublicado, suspenso (002/019), sem horários por 30 dias; saída ≤ 15 min do índice; link e QR continuam (REQ-VIT-033). Opt-in só do Proprietário, auditado.

## R7. Agendamento a partir da vitrine

- **Decisão**: tela única (serviço, profissional, horário e resumo) chama os contratos existentes de 008 (disponibilidade e hold), 009 (criação com `origin = discovery`), 010 (política) e 012 (pagamento) — nada reimplementado (REQ-VIT-020/021). Sem taxa adicional ao tenant na fase 2 além da taxa por agendamento do plano (019) (REQ-VIT-022).

## R8. SEO e desempenho das páginas

- **Decisão**: páginas de categoria e cidade em `koovela.com/{cidade}/{categoria}` (e `koovela.com/{cidade}`), pré-renderizadas pelo `consumer-web` (React Router 7, regeneração a cada 1 h e por evento de região), indexáveis, com sitemap; nomes de cidade e categoria entram na lista de slugs reservados da 005 com verificação de colisão (REQ-VIT-043). LCP < 2,5 s em 4G (Lighthouse CI), texto antes de imagens, imagens responsivas e preguiçosas, funcional em 3G, WCAG 2.1 AA (REQ-VIT-044).

## R9. Cookies e medição

- **Decisão**: só cookies estritamente necessários sem consentimento; medição adicional por banner com "Recusar" tão visível quanto "Aceitar", e medição primária sem cookie (contadores agregados no servidor, sem identificador) para o painel do negócio (REQ-VIT-053).

## R10. Desempenho do negócio e moderação

- **Decisão**: painel mensal com aparições, visitas vindas da vitrine, agendamentos de origem `discovery` e novos consumidores únicos, calculado no BI (023) e servido pelo `bi-api` (REQ-VIT-032). Denúncia de conteúdo pelo consumidor → fila de moderação do back-office (021); a Gestão pode retirar o negócio com aviso e trilha (REQ-VIT-050). Verticais, categorias, sinônimos e ordem da home mantidos pela Gestão, versionados (REQ-VIT-042).

## R11. Pré-requisito legal

- **Decisão**: a vitrine só é liberada (flag `discovery.home_tab` e `discovery.search`) depois de publicada a política de privacidade revista com a Koovela como controladora (022, REQ-PRI-063) — checagem automática no ligamento da flag (REQ-VIT-051).

## R12. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Home vitrine (aba Início) · resultados · agendamento em uma tela | C00 · a conferir no Figma (DF 9.10) |
| Web do consumidor | Home · resultados com filtros e mapa · agendamento | A conferir no Figma (DF 9.10) |
| Painel | Participação e desempenho | Nova |
| Back-office | Regiões · verticais e sinônimos · moderação da vitrine | Novas |
