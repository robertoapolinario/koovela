# Implementation Plan: Negócio, filiais e onboarding

**Branch**: `005-negocio-filiais-onboarding` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-negocio-filiais-onboarding/spec.md`

## Summary

Estender o domínio `tenancy` com:

- **Cliente, negócio, filial e vertical**, dentro do schema do tenant;
- **onboarding em dois caminhos** (O01 a O05):
  - **autônomo**: filial única criada sem aparecer no fluxo, e Proprietária + Colaboradora por evento ao `workforce`;
  - **rede**: várias filiais, com clonagem;
- **slug único global**: reservado por constraint, só o Suporte troca depois de publicado, slug antigo redireciona com 301 e nunca é reutilizado; projeção para o gateway;
- **link e QR** por negócio e filial, com contagem de visitas por origem;
- **página pública com SSR**: LCP < 2,5 s, cache e *purge* na Cloudflare, imagens AVIF/WebP no R2, mapa MapLibre + OpenFreeMap;
- **publicação**:
  - exige só termos, 1 serviço e 1 profissional com horário (clarify);
  - sem KYC aceita só pagamento no local; sem assinatura, entra em período de teste;
- **horário de funcionamento** com exceções e feriados (`date-holidays`);
- **dados cadastrais** PF/PJ cifrados, com consulta de CNPJ na BrasilAPI;
- **aceite de termos** com hash;
- **regras de saúde** (preço nunca aparece, taxa de agendamento fixa).

Decisões e alternativas em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**:
- Backend: Fastify 5, Zod, Kysely, `sharp` (imagens), `qrcode` + gerador de PDF (QR para impressão), `date-holidays`.
- Web: React Router 7 (SSR no `consumer-web`), MapLibre GL.
- Serviços externos gratuitos: BrasilAPI (CEP e CNPJ), Nominatim (geocodificação com cache), API da Cloudflare (*purge*).

**Storage**: schema do tenant (`tenancy_*`), `koovela_platform` (registro de slugs, verticais, termos reservados, documentos de termos, `platform_setting`), `koovela_projections.business_slug`; Redis (contadores de visita, cache de slug); R2 (`cdn.koovela.com`).

**Testing**: Vitest + Testcontainers; corrida de slug (exatamente um vence); 301 do slug antigo e não reutilização; máquina de estados de negócio e filial; prontidão por eventos; testes de contrato; Playwright + axe no onboarding, P18, P25, P26 e na página pública; Lighthouse CI (LCP < 2,5 s em 4G); suíte de isolamento estendida às rotas desta spec.

**Target Platform**: `core` (`tenancy`), `workers` (prontidão, visitas, geocodificação), `gateway` (resolução por slug), `tenant-web`, `consumer-web`, `consumer-mobile` (C04).

**Project Type**: extensão de domínio + página pública com SSR + telas de onboarding e painel.

**Performance Goals**: LCP < 2,5 s em 4G; resolução de slug no gateway ≤ 2 ms p95 (cache); onboarding do autônomo até o link publicado em ≤ 10 min de trabalho (meta de ativação DF 14); abrir filial por clonagem ≤ 10 min.

**Constraints**: slug único global e estável; nenhum dado pessoal (endereço, telefone, documento) em evento ou log; endereço exato oculto quando pedido; preço nunca exibido em saúde; geocodificação respeitando o limite de 1 req/s do Nominatim; R$ 0.

**Scale/Scope**: 500 tenants, 1 a N negócios por tenant, ~3 filiais por rede em média; visitas da página pública na casa de milhares por dia.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Horário de funcionamento é limite externo; mudar não cancela agendamento; sem escrita de agenda aqui | ✅ N/A |
| G-II | Isolamento | Dados no schema do tenant; só o registro de slugs e a projeção ficam globais; tenant da página pública vem do slug resolvido no gateway; suíte de isolamento estendida | ✅ |
| G-III | Dinheiro | Taxa de agendamento de saúde em centavos + `BRL`, versionada no back-office e no negócio | ✅ |
| G-IV | Dados pessoais | Documento, endereço e telefone cifrados; endereço exato oculto quando pedido; nada disso em evento ou log | ✅ |
| G-V | Permissões e auditoria | Ações na matriz (Proprietário cria e publica; Gerente edita horário e contato da própria filial; Recepção só lê); publicar, despublicar, trocar slug, encerrar filial, dados cadastrais e aceite auditados | ✅ |
| G-VI | Rastreabilidade | REQ-NEG com origem; PEN-06, PEN-11 e requisitos de publicação decididos no clarify | ✅ |
| G-VII | Contratos antes do código | [business.openapi.yaml](./contracts/business.openapi.yaml), [business-events.asyncapi.yaml](./contracts/business-events.asyncapi.yaml); prontidão e clonagem por eventos, sem ler tabela de 006, 007, 012 ou 019 | ✅ |
| G-VIII | Testes antes, invariantes | Corrida de slug, não reutilização, máquinas de estado, isolamento | ✅ |
| G-IX | Outbox, idempotência, DLQ | Eventos pelo outbox; onboarding idempotente por chave; consumidores de prontidão idempotentes | ✅ |
| G-X | ARM64, migrações, observabilidade | Migrações pelo executor da 002; métricas de ativação e LCP | ✅ |
| G-XI | Figma, tokens, a11y, superfícies | O01–O05, P01, P18, P25, P26, W04, W07, C04; axe e Lighthouse | ✅ |
| G-XII | Complexidade | Serviços externos gratuitos e bibliotecas; nenhum serviço novo | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/005-negocio-filiais-onboarding/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── business.openapi.yaml
    └── business-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/tenancy/src/
├── onboarding/            # orquestração, progresso, caminho solo/rede
├── business/              # negócio, publicação, prontidão, mídia, QR
├── branches/              # filiais, clonagem, estados
├── hours/                 # horário semanal, exceções, feriados
├── slugs/                 # registro global, normalização, reservados, troca pelo suporte, projeção
├── client-profile/        # PF/PJ, documento, CNPJ, termos
└── public/                # GET /v1/public/businesses/{slug}, contador de visitas
services/tenancy/migrations/          # tabelas tenancy_* (tenant e globais)
services/gateway/src/plugins/tenant-resolution.ts   # passa a ler a projeção business_slug
apps/tenant-web/src/routes/onboarding/  # O01–O05
apps/tenant-web/src/routes/{dashboard,branches,hours,settings}/  # P01 · P25 · P18 · P26
apps/consumer-web/app/routes/$slug.tsx  # W04/W07 (SSR) + página neutra
apps/consumer-mobile/app/business/[slug].tsx  # C04
packages/platform/geo/                # CEP, geocodificação com cache e limite
packages/platform/media/              # sharp → R2 / cdn.koovela.com
```

**Structure Decision**: tudo dentro do domínio `tenancy` (fronteira lógica da CONST 4.4); a página pública fica no `consumer-web` com SSR; as bibliotecas `geo` e `media` vão para `packages/platform`, porque catálogo, portfólio e outras specs também enviam imagem e endereço.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Nominatim**: política de uso limita volume; se o onboarding crescer, migrar para uma instância própria do Photon/Nominatim na OCI (sem custo de licença).
- **OpenFreeMap**: serviço comunitário gratuito; o navegador do visitante baixa os tiles direto dele (IP exposto ao terceiro, registrado na política de privacidade); plano B com tiles PMTiles do Brasil servidos pelo R2 (R$ 0).
- **Envio mínimo ao Nominatim**: sem complemento e, com "mostrar só o bairro", sem número (research R6).
- **Prontidão depende de 006 e 007**: até lá, *stubs* de evento nos testes.
- **Contagem de agendamentos fora do horário**: depende do contrato de consulta da spec 009; até lá, a tela informa "não disponível".
