# Research: Negócio, filiais e onboarding (005)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 001 (borda, CDN, R2, SSR), 002 (`tenancy`, provisionamento, schema por tenant), 003 (contas de equipe, papéis, slug no gateway), 004 (auditoria, flags). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e onde ficam os dados

- **Decisão**: domínio `tenancy` (CONST 4.4: "tenant, negócio, filial, vertical"). No **schema do tenant**: dados cadastrais do Cliente, negócios, filiais, horários, exceções, aceites de termos, progresso do onboarding e visitas agregadas (REQ-NEG-072). No **espaço global** `koovela_platform`: catálogo de verticais, registro global de slugs (unicidade e histórico), termos reservados e ofensivos, documentos de termos. Em `koovela_projections`: `business_slug` (slug → tenant, negócio, filial, estado), lida pelo gateway (REQ-IDN-040).
- **Por quê**: só o que precisa atravessar tenants fica global.

## R2. Slug único na plataforma

- **Decisão**: `tenancy_slug_registry` global com `UNIQUE(slug)`; reservar um slug é um `INSERT` (a constraint resolve a corrida de dois negócios, edge case). Estados: `reserved` (rascunho) → `active` (publicado) → `redirect` (substituído, aponta para o atual, nunca liberado) e `blocked` (retirado por marca ou ofensa). Normalização: NFD sem acentos, minúsculas, `[a-z0-9-]`, 3 a 50 caracteres, sem hífen duplo nas pontas. Listas de reservados (rotas, subdomínios e `.well-known`) e de termos ofensivos no banco, editáveis pela Gestão. Troca depois de publicado só pela API de suporte, com justificativa e auditoria (REQ-NEG-041). A projeção `business_slug` é atualizada por evento e invalida o cache do gateway e o da Cloudflare.
- **Alternativas**: unicidade checada só na aplicação (corrida); slug dentro do schema do tenant (impossível garantir unicidade global).

## R3. Orquestração do onboarding

- **Decisão**: fluxo no `tenant-web` (O01 a O05) com estado salvo no servidor (`tenancy_onboarding_progress`) a cada passo (REQ-NEG-013):
  1. conta de equipe (spec 003);
  2. `POST /v1/onboarding/clients`: gera `tenant_id`, pede o provisionamento (spec 002, idempotente), cria o Proprietário (contrato interno do `identity`), o negócio e, no caminho autônomo, a filial única;
  3. enquanto o tenant está `provisioning`, a tela mostra "preparando sua conta" com consulta a cada 3 s; passados 2 minutos, informa que segue em segundo plano e manda e-mail ao terminar.
- No caminho autônomo, `tenancy.client.onboarded.v1` com `path=solo` faz o `workforce` (spec 007) criar o registro de colaborador da Proprietária (REQ-NEG-011), por evento, sem chamada direta.
- **Por quê**: o provisionamento é assíncrono por natureza; eventos evitam acoplar `tenancy` a `workforce`.

## R4. Requisitos de publicação

- **Decisão**: `tenancy_publication_readiness` por negócio, atualizada por eventos dos domínios donos: termos aceitos (próprio), `catalog.service.published.v1` (006) e `workforce.professional.availability_set.v1` (007). Publicar exige os três (REQ-NEG-016, clarify). KYC (012) e assinatura (019) **não** bloqueiam: sem KYC, a página mostra só "pagamento no local"; sem assinatura, período de teste. A lista de passos do painel lê essa tabela (REQ-NEG-015).
- **Alternativas**: consultar catálogo e equipe na hora (acopla e cruza tabela de outro domínio).

## R5. Página pública e desempenho

- **Decisão**: `consumer-web` (React Router 7 com SSR) renderiza `koovela.com/{slug}` e `/{slug}/{filial}` a partir de `GET /v1/public/businesses/{slug}` (gateway resolve o tenant pelo slug). Cache na Cloudflare (`s-maxage=60, stale-while-revalidate`) com *purge* pela API gratuita da Cloudflare ao publicar ou editar. Imagens: no envio, o `sharp` converte para AVIF e WebP em 3 larguras, grava no R2 e serve por `cdn.koovela.com` (domínio próprio do R2, gratuito). Meta tags Open Graph e Twitter com nome, cidade e capa (REQ-NEG-047). Mensagem neutra para despublicado, suspenso ou filial encerrada (REQ-NEG-053), com 200 e `noindex`.
- **Meta**: LCP < 2,5 s em 4G (REQ-NEG-054) e WCAG AA (REQ-NEG-055), medidos no CI (Lighthouse CI e axe).
- **Alternativas**: Cloudflare Images ou Image Resizing (pagos); SPA sem SSR (SEO e LCP ruins).

## R6. Endereço, mapa e geolocalização (R$ 0)

- **Decisão**: CEP preenche rua, bairro e cidade pela **BrasilAPI** (gratuita); coordenadas pelo **Nominatim** (OpenStreetMap), respeitando 1 requisição por segundo, com cache e *User-Agent* genérico da Koovela; se não achar, o Proprietário marca o ponto no mapa (edge case "área rural"). Mapa com **MapLibre GL** e tiles do **OpenFreeMap** (gratuito, sem chave). "Mostrar só o bairro" guarda o ponto do centróide do bairro para a exibição pública e o ponto real só para depois da confirmação (REQ-NEG-051). **Envio mínimo** (análise de 2026-11-26, CONST IV): a consulta ao Nominatim nunca leva complemento; com "mostrar só o bairro", também não leva o número. O ponto exato é ajustado pelo Proprietário no mapa.
- **Alternativas**: Google Maps (cobrado acima da cota e exige chave), tiles do OSM direto (política de uso não comporta produção).

## R7. CNPJ e documentos

- **Decisão**: CPF e CNPJ validados por dígito verificador, cifrados por campo com HMAC de busca (`packages/platform/crypto`, spec 003). Preenchimento de razão social e endereço pela consulta pública de CNPJ da **BrasilAPI**, com confirmação do Proprietário (REQ-NEG-060). CNPJ é dado de empresa; CPF do autônomo nunca sai para serviço externo.

## R8. Horário de funcionamento, exceções e feriados

- **Decisão**: horário semanal guardado como **hora local** (`TIME`) + fuso IANA da filial, porque é um horário de parede, não um instante; instantes (exceções com hora, eventos) em UTC (CONST XI). Exceções por data prevalecem. Feriados nacionais sugeridos pela biblioteca **date-holidays** (offline, gratuita), com opção de incluir os estaduais e municipais da cidade da filial; o Proprietário confirma (REQ-NEG-031). Mudança de horário publica `tenancy.branch.hours_changed.v1`; a contagem de agendamentos fora do novo horário vem do contrato de consulta da spec 009 (até lá, a tela informa "não disponível") e nada é cancelado (REQ-NEG-032). O horário é publicado por contrato para a spec 008 (REQ-NEG-033).

## R9. Clonagem de filial

- **Decisão**: `POST /v1/tenant/branches/{id}/clone` cria a filial em `draft` com horário, exceções futuras e configurações de exibição; publica `tenancy.branch.cloned.v1 { source_branch_id, target_branch_id }`, e o `catalog` (006) copia o catálogo disponível. As regras de comissão do `workforce` (007) são por negócio e não precisam de cópia (research R9 da 007). Endereço, telefone e equipe não são copiados (REQ-NEG-021). Meta de 10 minutos de trabalho do Proprietário (REQ-NEG-022) medida do clique até a ativação.

## R10. Link, QR e contagem de visitas

- **Decisão**: link `https://koovela.com/{slug}[/{filial}]?src=link`, QR com `?src=qr`. QR gerado no servidor com a biblioteca `qrcode`: SVG para tela e PDF A6 para impressão (com logo Koovela e nome do negócio, cores dos tokens). Visitas: o SSR incrementa contadores em Redis por `(tenant, negócio, filial, origem, dia)` e um job horário grava em `tenancy_page_visit_daily` no schema do tenant (REQ-NEG-045); a origem segue em *cookie* de sessão de primeira parte até o agendamento (spec 009). Links universais da spec 001 abrem o app (REQ-NEG-046).

## R11. Verticais e saúde

- **Decisão**: `tenancy_vertical` global (cluster, categoria, vocabulário, campos padrão, `price_display` = `public` \| `never`, flags de restrição de saúde) semeada com as categorias da DF 4.1 (clusters A e B) e já com os registros das fases 2 e 3 desativados (REQ-NEG-002). Em saúde (PEN-06): `price_display = never` e **taxa de agendamento fixa**: padrão e faixa permitida configuráveis no back-office (`platform_setting.health_booking_fee`), valor do negócio dentro da faixa (`business.booking_fee_cents`), em centavos (CONST III). Todas as superfícies leem `price_display` do negócio, nunca decidem por conta própria.

## R12. Termos de uso

- **Decisão**: `tenancy_terms_document` global (tipo, versão, URL, SHA-256 do conteúdo, vigência). Aceite no schema do tenant com hash, versão, IP, aparelho e horário (CONST 5, REQ-NEG-061). Nova versão em vigor → o gateway responde `tenancy.terms_acceptance_required` a qualquer rota do painel, exceto a de aceite. Texto deixa claro que a Koovela intermedeia e não executa o serviço (REQ-NEG-062).

## R13. Telas (Figma)

| Superfície | Tela | Código |
|---|---|---|
| Painel (onboarding) | Conta e negócio com vertical · Filiais · Serviços e preços · Horários e colaboradores · Recebedor, KYC e NFS-e | O01 · O02 · O03 · O04 · O05 |
| Painel | Dashboard (lista de passos) · Filiais: criar e clonar · Horário de funcionamento · Configurações, link e QR | P01 · P25 · P18 · P26 |
| Web do consumidor | Chegada pelo link ou QR · Página do estabelecimento | W04 · W07 |
| App do consumidor | Página do estabelecimento | C04 |

O03 é da spec 006 e O05 das specs 012/017; esta spec entrega o fluxo que os encadeia.
