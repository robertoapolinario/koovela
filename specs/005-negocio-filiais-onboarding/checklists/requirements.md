# Specification Quality Checklist: Negócio, filiais e onboarding

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Detalhes de implementação**: endereços `koovela.com/{slug}`, redirecionamento 301, `cdn.koovela.com`
  e LCP vêm da constituição (seções 3 e 6). Geocodificação, geração de QR e fonte de consulta de CNPJ
  ficam para o plano.
- **[NEEDS CLARIFICATION] restantes (3)**, a resolver no `/speckit-clarify` antes do plano:
  1. `PEN-11`: recebedor do split por negócio ou por filial?
  2. `PEN-06`: preço e publicidade nas verticais de saúde (desligados por padrão até a decisão).
  3. Requisitos para publicar e aceitar agendamentos: só catálogo e agenda, ou também KYC aprovado e
     assinatura ativa?
- **Seções da CONST 9.2**: as 11 estão presentes.
- **Clarify 2026-11-25**: todas as perguntas em aberto foram respondidas no `/speckit-clarify` em lote.
