# Implementation Plan: Avaliações

**Branch**: `016-avaliacoes` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-avaliacoes/spec.md`

## Summary

Criar o submódulo `reviews` do `engagement`:

- **Avaliação** só de atendimento concluído, uma por agendamento, pedida 2 h depois com lembrete no 3º dia e prazo de 14 dias (séries a cada 5 ocorrências); bloqueada para membros da equipe; OTP no pré-cadastro; nenhuma recompensa.
- **Publicação 48 h após o envio** fora da saúde, se o negócio mostrar avaliações na página (PEN-19); **saúde sempre privada** (PEN-06).
- **Médias de 12 meses** por estabelecimento, filial e profissional, só com ≥ 5 avaliações, por projeção de eventos e disponíveis por contrato para a vitrine (PEN-26).
- **Resposta única** da equipe; estabelecimento nunca edita nem remove.
- **Triagem automática** local (termos, dados pessoais, saúde) e **moderação pela Koovela** de denúncias em 3 dias úteis, auditada; antifraude por pico de volume.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/audit`; contratos da 009 e da 011.

**Storage**: schema do tenant (`reviews_*`); `koovela_platform.engagement_rating_summary` (projeção global sem texto); `koovela_platform.review_moderation_terms`; RabbitMQ `engagement.events`.

**Testing**: elegibilidade (concluído, única, equipe, prazo); publicação em 48 h; limiar de 5; saúde nunca pública; triagem (celular, CPF, e-mail, termos); matriz (estabelecimento sem editar/remover); contrato dos eventos sem texto nem autor; isolamento; axe em C13, W15, P24.

**Target Platform**: `core` (`engagement`), `workers` (pedidos, publicação, projeções, reconstrução noturna, antifraude), apps, painel, back-office.

**Project Type**: submódulo de domínio + telas em todas as superfícies.

**Performance Goals**: lista pública de avaliações ≤ 300 ms p95 (projeção + cursor); projeção atualizada ≤ 1 min após publicação.

**Constraints**: texto do comentário nunca em eventos nem na vitrine; autor só "Nome I."; triagem sem serviço externo (custo zero, LGPD).

**Scale/Scope**: ~30% dos atendimentos avaliados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Sem escrita de agenda | ✅ N/A |
| G-II | Isolamento | Avaliações no tenant; projeção global só com ids e nota | ✅ |
| G-III | Dinheiro | Nenhuma recompensa por avaliação | ✅ N/A |
| G-IV | Dados pessoais | Autor "Nome I."; triagem de dados pessoais e de saúde; saúde privada; eventos sem texto | ✅ |
| G-V | Permissões e auditoria | Resposta pelos três papéis; estabelecimento sem editar/remover (teste da matriz); moderação auditada | ✅ |
| G-VI | Rastreabilidade | PEN-19, PEN-06, PEN-26 decididos | ✅ |
| G-VII | Contratos | [reviews.openapi.yaml](./contracts/reviews.openapi.yaml), [reviews-events.asyncapi.yaml](./contracts/reviews-events.asyncapi.yaml); contrato de médias para a 024 | ✅ |
| G-VIII | Testes antes | Elegibilidade, limiar, triagem, contrato de eventos | ✅ |
| G-IX | Outbox | Eventos pelo outbox; projeções idempotentes por `review_id` | ✅ |
| G-X | Observabilidade | Taxa de avaliação, fila e SLA de moderação | ✅ |
| G-XI | Figma, a11y | C13, C04, C06, W15, W05, P24, K05; fila de moderação nova; denúncia a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/016-avaliacoes/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── reviews.openapi.yaml
    └── reviews-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/engagement/src/reviews/{submit,publish,screening,replies,reports,projections,antifraud}/
apps/consumer-mobile · consumer-web     # C13 C04 C06 · W15 W05
apps/tenant-web/src/routes/reviews      # P24 + denúncia
apps/pro-mobile                         # K05
apps/admin-web/src/routes/moderation    # fila de moderação (nova)
```

**Structure Decision**: submódulo `reviews` do `engagement` (CONST 4.4); projeção global em `koovela_platform` (dona: `engagement`), publicada à vitrine por `engagement.rating_summary.changed.v1` (análise da 024).

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas a conferir**: denúncia pelo estabelecimento e fila de moderação no back-office (tela nova, sem código no Figma).
- **Lista de termos**: começa curta e cresce pela moderação; falsos positivos só retêm (nunca removem).
