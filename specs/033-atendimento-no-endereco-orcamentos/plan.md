# Implementation Plan: Atendimento no endereço e orçamentos

**Branch**: `033-atendimento-no-endereco-orcamentos` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/033-atendimento-no-endereco-orcamentos/spec.md`

## Summary

Atender as verticais automotivo e casa da fase 3 (D40):

- **Local por serviço** no catálogo (`on_premises` ou `customer_address`), com o deslocamento embutido no preço e sem taxa separada. Combos não misturam locais.
- **Área de atendimento por filial**, por raio (padrão 10 km) ou por lista de bairros (PEN-27). A verificação usa o CEP e o bairro (BrasilAPI e Nominatim com cache), sem guardar a coordenada da casa.
- **Deslocamento na agenda** (padrão 30 min) como segmento `travel` na ocupação da 008, protegido pela mesma PK de células. O deslocamento é dispensado entre atendimentos seguidos no mesmo endereço, comparados por `address_key` (HMAC).
- **Endereços do consumidor** cifrados na conta global, com snapshot cifrado no agendamento. A mudança de endereço depois da confirmação só é aceita dentro da área.
- **Rota do dia** no `pro-mobile` e no `/pro`: só os atendimentos atribuídos ao colaborador, do dia, com acesso auditado. Tem "abrir no mapa", "cheguei", "cliente ausente" depois da tolerância e "vou atrasar", e funciona offline com cache cifrado apagado ao fim do dia.
- **Orçamentos** no novo domínio `quotes` (`quote_request`, reaproveitável pela 035):
  - pedido com descrição, até 5 fotos privadas (sem EXIF, URL assinada, retenção de 90 dias), endereço, veículo e preferência de datas;
  - resposta com preço e duração, recusa, ou uma rodada de pedido de informação;
  - prazos configuráveis dentro dos limites do back-office (PEN-31, iniciais 48 h e 7 dias);
  - no aceite, o agendamento sai com preço e duração do orçamento congelados.
- **Veículo** como novo tipo de atendido (025), com duração e preço por porte.
- **Filtro na vitrine** "atende no meu endereço" (024).

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**:
- Fastify 5, Zod, Kysely e `packages/platform/crypto` (envelope).
- Contratos de 005 (geocodificação), 006, 008, 009, 010, 011, 012, 020 (padrão de fotos), 022, 024 e 025.
- BrasilAPI (CEP) e Nominatim, gratuitos e com cache.
- `sharp` (remoção de EXIF, WebP e miniatura) e OCI Object Storage (bucket privado).
- Expo SQLite com `expo-secure-store` para o cache offline cifrado. TanStack Query.

**Storage**:
- Schema do tenant: `quotes_*`, `scheduling_service_area`, `appointment_address_snapshot`, `scheduling_field_event`, `scheduling_address_access_log` e as extensões de `scheduling_occupancy`.
- `koovela_identity`: endereços e veículos.
- `koovela_platform`: `quotes_limits` e `geo_cep_cache`.
- `koovela_projections`: `consumer_quotes_index`.
- Object Storage para as fotos. RabbitMQ nos canais `catalog`, `scheduling` e `quotes`.

**Testing**:
- Concorrência de células com segmentos `travel`, incluindo a regra de mesmo endereço e a recomposição.
- Cobertura por área: raio, bairros e CEP rural.
- Privacidade: acesso ao endereço na rota, EXIF removido, URL assinada, retenção de 90 dias, `HolderDataPort`.
- Máquina de estados do pedido e do orçamento, com expiração por relógio simulado.
- Preço congelado no aceite. Validação de combo misto. Fila offline idempotente.
- axe AA nas telas novas.

**Target Platform**: `core` (`catalog`, `scheduling`, `quotes`, `identity`, `discovery`), `workers` (expiração, tratamento e limpeza de fotos, recomposição de deslocamento), `tenant-web` (+ `/pro`), `pro-mobile`, `consumer-mobile`, `consumer-web` e `admin-web` (limites).

**Project Type**: novo domínio (`quotes`) mais extensões em catálogo, agenda, identidade e vitrine, com telas em todas as superfícies.

**Performance Goals**:
- Verificação de cobertura ≤ 300 ms p95 com o cache aquecido.
- A disponibilidade com deslocamento mantém o p95 da 008.
- Rota do dia ≤ 500 ms p95.
- Pedido de orçamento com fotos em ≤ 2 min de ponta a ponta (SC-003).

**Constraints**:
- Sem taxa de deslocamento (D40).
- Custo zero: sem geocodificação ou rotas pagas.
- O endereço e as fotos nunca vão para eventos, logs ou índices.
- O colaborador só vê o endereço no dia e nos atendimentos atribuídos a ele.

**Scale/Scope**: até 10 endereços e 10 veículos por consumidor; até 5 fotos por pedido; rotas de até cerca de 20 paradas por dia.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Deslocamento como ocupação com células e PK como garantia; hold e regras da 008 intactos | ✅ |
| G-II | Isolamento | `quotes` no tenant; endereço e veículo globais, com snapshot no tenant; histórico do veículo só do próprio negócio | ✅ |
| G-III | Dinheiro | Preço do orçamento em centavos, congelado no agendamento; sem taxa de deslocamento | ✅ |
| G-IV | Dados pessoais | Endereço, descrição, mensagens e placa cifrados; fotos sem EXIF e com retenção de 90 dias; acesso do colaborador limitado e auditado; offline apagado ao fim do dia | ✅ |
| G-V | Permissões e auditoria | Ações conforme a tabela da spec; limites no back-office auditados; leitura de endereço registrada | ✅ |
| G-VI | Rastreabilidade | D40, PEN-27 e PEN-31 decididos; PEN-06 e PEN-26 respeitados | ✅ |
| G-VII | Contratos | [address-quotes.openapi.yaml](./contracts/address-quotes.openapi.yaml), [address-quotes-events.asyncapi.yaml](./contracts/address-quotes-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Concorrência com deslocamento, privacidade da rota, preço congelado | ✅ |
| G-IX | Outbox e idempotência | Eventos sem dado pessoal sensível; fila offline com `client_op_id` | ✅ |
| G-X | Observabilidade | Respostas no prazo (meta ≥ 90%), conversão, atrasos, falhas de geocodificação | ✅ |
| G-XI | Figma e a11y | Telas da DF 9.11 a conferir; veículo e "vou atrasar" a conferir; WCAG AA | ✅ com pendência de protótipo |
| G-XII | Complexidade | Novo domínio `quotes` previsto na CONST 4.4; nenhum serviço novo | ✅ |

**Reavaliação pós-design**: mantida. As extensões em 006, 008, 009, 024 e 025 são aditivas e retrocompatíveis.

## Project Structure

### Documentation (this feature, local only)

```text
specs/033-atendimento-no-endereco-orcamentos/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── address-quotes.openapi.yaml
    └── address-quotes-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/catalog/src/services/                       # location, quote_mode, regra por porte de veículo, combo
services/scheduling/src/{service-area,travel,route,field-events,address}/
services/quotes/src/{requests,quotes,photos,settings,expiry}/
services/identity/src/{addresses,subjects/vehicle}/
services/discovery/src/search/                       # filtro at_my_address
services/workers/src/{quotes,scheduling/travel-recompose}/
packages/platform/geo/                               # CEP → bairro/centróide, cache, haversine
apps/tenant-web/src/routes/{catalog/onde,quotes,pro/rota}
apps/pro-mobile/app/rota
apps/consumer-mobile/src/app/{orcamentos,enderecos,atendidos}
apps/consumer-web/src/routes/{orcamentos,enderecos}
apps/admin-web/src/routes/quotes/limites
```

**Structure Decision**: o domínio `quotes` fica no schema do tenant (como `scheduling`). A geocodificação da 005 sai para um pacote `packages/platform/geo`, compartilhado com a 024. O deslocamento é modelado como ocupação, sem lógica paralela de bloqueio.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas**: as da DF 9.11 precisam ser conferidas no Figma. O cadastro de veículo e o "vou atrasar" ainda não estão no protótipo.
- **Nominatim**: a política de uso limita a 1 requisição por segundo. O cache de CEP reduz as chamadas. Se o volume crescer, a saída é um Nominatim self-hosted (custo zero, mais disco).
- **Recomposição do deslocamento** ao cancelar: um conflito vira pendência para a Recepção em vez de ajuste automático, o que pode gerar trabalho manual em agendas apertadas.
- **Precisão do raio**: o centróide do CEP pode errar algumas centenas de metros nas bordas da área. É aceitável pela regra de usar CEP e bairro.
- **Saúde no endereço**: segue as regras da vertical (PEN-06), sem mudança aqui.
