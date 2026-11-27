# Implementation Plan: Fiscal — NFS-e

**Branch**: `017-fiscal-nfse` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-fiscal-nfse/spec.md`

## Summary

Criar o domínio `fiscal`:

- **Emitente por negócio**: emissão própria com certificado A1 (padrão) ou nota pela Koovela, **desligada por flag** até parecer de contador (PEN-21, CONST 5); perfil fiscal por emitente e emitente por filial; PF sem CNPJ recebe recibo não fiscal.
- **Integração direta e gratuita com a prefeitura** atrás de `FiscalProvider`: São Paulo na v1.0, padrão nacional (MEI) e `fake` para CI; municípios sem adaptador ficam indisponíveis com aviso.
- **Certificado cifrado** por envelope com chave fora do banco, senha nunca em log, step-up na troca, aviso de vencimento.
- **Emissão automática idempotente** na conclusão paga, pelo valor efetivamente pago; sem nota para valor zero, multa e sinal; pacote por sessão (padrão) ou na venda (PEN-24); CPF na nota opcional.
- **Fila com novas tentativas** por 72 h, recusas explicadas, cancelamento no estorno total e pendência no parcial.
- **Histórico, exportação mensal** (planilha e zip) e guarda de XML e PDF por 5 anos.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; `node-forge` (leitura do PKCS#12) e `xml-crypto` (assinatura XMLDSig) só dentro do adaptador; `exceljs`, `archiver`; OCI Vault (chave mestra).

**Storage**: schema do tenant (`fiscal_*`); Object Storage para XML e PDF com retenção de 5 anos; `koovela_platform.fiscal_service_suggestion`; RabbitMQ `fiscal.events` com DLQ.

**Testing**: idempotência (3 reenvios → 1 nota; RPS nunca reutilizado); regras de não emissão; novas tentativas e prazo de 72 h; segredos fora de log, resposta e evento; flag do modo Koovela; contrato com homologação de São Paulo; isolamento; axe em P23.

**Target Platform**: `workers` (emissão, novas tentativas, cancelamento, avisos de vencimento, exportação), `core` (APIs), painel, apps e back-office.

**Project Type**: domínio com integração externa + telas no painel, no consumidor e no back-office.

**Performance Goals**: nota pedida ≤ 1 min após a conclusão paga; autorização dependente da prefeitura (meta interna: 95% em ≤ 10 min).

**Constraints**: custo zero (sem agregador pago); certificado decifrado só em memória no `workers`; valor da nota = valor pago pelo serviço; mudanças de leiaute só no adaptador.

**Scale/Scope**: até ~50 mil notas/mês na escala inicial.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Sem escrita de agenda | ✅ N/A |
| G-II | Isolamento | Perfil, certificados e notas no tenant | ✅ |
| G-III | Dinheiro e idempotência | Centavos e pontos-base; uma nota por fonte; RPS único | ✅ |
| G-IV | Dados pessoais e segredos | CPF só por escolha; certificado e senha cifrados com chave fora do banco; nunca em log ou evento | ✅ |
| G-V | Permissões e auditoria | Emissão manual pelos papéis da matriz; troca de certificado com step-up; tudo auditado | ✅ |
| G-VI | Rastreabilidade | PEN-21 (flag, CONST 5) e PEN-24 decididos | ✅ |
| G-VII | Contratos | [fiscal.openapi.yaml](./contracts/fiscal.openapi.yaml), [fiscal-events.asyncapi.yaml](./contracts/fiscal-events.asyncapi.yaml); `FiscalProvider` isolado | ✅ |
| G-VIII | Testes antes | Idempotência, não emissão, segredos | ✅ |
| G-IX | Outbox, novas tentativas, DLQ | Fila com intervalos crescentes por 72 h; DLQ | ✅ |
| G-X | Observabilidade | Pendentes > 24 h; falhas por município ao SRE; certificados a vencer | ✅ |
| G-XI | Figma, a11y | O05, P23, P09, C16, C08, W18, W11; back-office novo | ✅ com pendência de protótipo |
| G-XII | Complexidade | Adaptador justificado (como o da 012) | ✅ |

**Reavaliação pós-design**: mantida. CONST 5 respeitada: o modo "nota pela Koovela" não é alcançável sem a flag.

## Project Structure

### Documentation (this feature, local only)

```text
specs/017-fiscal-nfse/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── fiscal.openapi.yaml
    └── fiscal-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/fiscal/src/{settings,issuers,certificates,service-tax,emission,retries,cancellation,exports,pending}/
packages/platform/fiscal/               # FiscalProvider + adaptadores (sp-paulistana, national, fake)
apps/tenant-web/src/routes/{onboarding/fiscal,fiscal}   # O05 · P23 · dados fiscais em P09
apps/consumer-mobile · consumer-web     # nota no concluído (C16/W18) · CPF na nota (C08/W11)
apps/admin-web/src/routes/fiscal        # falhas por município e certificados (nova)
```

**Structure Decision**: domínio `fiscal` (CONST 4.4) com adaptador por município em `packages/platform/fiscal`.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Adaptador por município (`FiscalProvider`) | Cada prefeitura tem leiaute próprio e o padrão nacional está em adesão | Agregador pago (viola custo zero) |

## Riscos e pendências

- **Leiaute e adesão de São Paulo ao padrão nacional**: confirmar na implementação (tarefa de verificação); o adaptador isola a mudança.
- **Nota pela Koovela**: fica desligada até parecer de contador e nova emenda (CONST 5).
- **Cobertura de municípios**: filiais fora de São Paulo e de municípios do padrão nacional ficam sem emissão na v1.0.
- **Tela nova no back-office**: falhas por município e certificados a vencer.
- **Momento da nota de pacote e vale** (PEN-24): padrão `per_session` e vale sempre no uso, alinhado com a 029; validar com contador (base do ISS e fato gerador).
- **Cota do Object Storage**: a guarda de 5 anos dos XML e PDF conta nos 20 GB gratuitos da OCI; métrica com aviso em 80%.
