# Implementation Plan: Privacidade e direitos do titular

**Branch**: `022-privacidade-direitos-titular` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/022-privacidade-direitos-titular/spec.md`

## Summary

Criar o domínio `privacy` em `koovela_platform`, que **orquestra** os direitos do titular pelos contratos dos domínios donos:

- **Contrato `HolderDataPort` obrigatório** (describe, export, erase, restrictions) em todo domínio com PII, com portão de CI e teste de ponta a ponta.
- **Acesso** imediato, **exportação** (JSON + PDF) em ≤ 7 dias (meta 24 h) com OTP e link de 7 dias, compartilhamentos e política versionada.
- **Eliminação** em ≤ 15 dias, total ou por estabelecimento, com prévia, bloqueio do que tem guarda legal, prazo para o estabelecimento justificar e eliminação automática sem resposta (C4), limpeza da trilha (pseudônimos mantidos) e dos provedores externos, comprovante; **livro de eliminações reaplicado após restauração de backup**.
- **Registro central de consentimentos** com revogação ≤ 1 min no domínio dono; correções globais e por estabelecimento.
- **Tabela de retenção** versionada pelo Encarregado, aplicada diariamente; extensão pelo Proprietário só onde permitido.
- **Estabelecimento**: pedidos de titulares com prazos; exportação completa do tenant (com anotações) e saída com eliminação após 90 dias, mantendo só a conta global.
- **Encarregado**: fila, entrada por e-mail, acesso temporário, registro de incidentes com rascunhos de comunicação.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; `packages/contracts/privacy` (port e registro); `packages/platform/crypto` (pacotes cifrados, crypto-shredding); `archiver`; Chromium headless (PDF); restic (runbook de restauração).

**Storage**: `koovela_platform` (`privacy_*`); Object Storage para pacotes (7 dias); R2 para o espelho do livro de eliminações; RabbitMQ `privacy.commands` e `privacy.events`.

**Testing**: portão de ports; e2e de exportação e eliminação em todos os domínios (nada sem guarda sobra); replay após restauração (DR mensal); prazos e alertas; revogação ≤ 1 min; matriz (Proprietário só; Encarregado temporário); isolamento; axe nas telas novas.

**Target Platform**: `core` (APIs), `workers` (saga, retenção diária, prazos, pacotes, incidentes), app e web do consumidor, painel, back-office, site público.

**Project Type**: domínio orquestrador transversal + telas em quatro superfícies.

**Performance Goals**: exportação ≤ 24 h (meta), ≤ 7 dias (limite); eliminação ≤ 15 dias; revogação ≤ 1 min; visão "meus dados" ≤ 1 s.

**Constraints**: `privacy` nunca acessa tabelas alheias; pacotes cifrados e de vida curta; livro de eliminações sem PII.

**Scale/Scope**: centenas de pedidos por mês no início; retenção diária em todos os tenants.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Cancelamento de futuros pela 009 (sem multa, direito do titular) | ✅ N/A |
| G-II | Isolamento | Só contratos por domínio e tenant; nenhum acesso direto | ✅ |
| G-III | Dinheiro | Dados fiscais e de pagamento bloqueados (guarda legal), nunca alterados | ✅ |
| G-IV | Dados pessoais | Direitos do art. 18 completos; retenção por tabela; eliminação inclusive em backups e provedores; incidentes (art. 48) | ✅ |
| G-V | Permissões e auditoria | Exportação do tenant com step-up; Encarregado temporário; tudo na trilha | ✅ |
| G-VI | Rastreabilidade | C4, PEN-05, PEN-10 decididos; registrar C4 no Documento Fundamental | ✅ com pendência documental |
| G-VII | Contratos | [privacy.openapi.yaml](./contracts/privacy.openapi.yaml), [privacy-events.asyncapi.yaml](./contracts/privacy-events.asyncapi.yaml); `HolderDataPort` em todos os domínios | ✅ |
| G-VIII | Testes antes | Portão de ports e e2e | ✅ |
| G-IX | Outbox, idempotência | Saga com passos idempotentes por (pedido, domínio, tenant) | ✅ |
| G-X | Observabilidade | Prazos dos pedidos, falhas de passos, DR com replay | ✅ |
| G-XI | Figma, a11y | Todas as telas são novas (exceto excluir conta) | ✅ com pendência de protótipo |
| G-XII | Complexidade | Saga justificada abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/022-privacidade-direitos-titular/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── privacy.openapi.yaml
    └── privacy-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/privacy/src/{requests,saga,consents,retention,business-tasks,tenant-export,erasure-ledger,incidents,policy,dpo}/
packages/contracts/privacy/              # HolderDataPort + holder-ports.yaml
services/*/src/holder-data/              # implementação do port em cada domínio
tools/privacy-replay/                    # replay de eliminações após restauração
apps/consumer-mobile · consumer-web      # meus dados, consentimentos, pedidos (Perfil C18/W20)
apps/tenant-web/src/routes/settings/privacy   # pedidos de titulares, exportação completa
apps/admin-web/src/routes/privacy        # fila do Encarregado, retenção, incidentes
apps/consumer-web/src/routes/privacidade # política com versões
```

**Structure Decision**: domínio `privacy` orquestrador; cada domínio implementa o próprio port.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Saga multi-domínio e multi-tenant com livro de eliminações | Dados pessoais vivem em vários domínios e schemas; a eliminação precisa ser completa, auditável e sobreviver a restaurações | Script central que apaga tabelas direto (viola CONST II e a posse dos domínios) |

## Riscos e pendências

- **Fechar o C4 no Documento Fundamental** (`.specify/docs/fundamental/decisoes.md`, já na lista de pendências).
- **Telas novas** em todas as superfícies.
- **Custo da saga**: cada novo domínio (fase 2) precisa implementar o port antes de guardar PII (portão de CI).
- **Efeitos da eliminação** (pontos e saldos perdidos) precisam de texto revisado pelo jurídico.
