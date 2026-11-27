# Implementation Plan: Antecipação de recebíveis

**Branch**: `036-antecipacao-recebiveis` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/036-antecipacao-recebiveis/spec.md`

## Summary

Criar o submódulo `advances` do domínio `finance` (D38). A antecipação é sempre sob demanda, por meio de um parceiro financeiro atrás da porta `AdvanceProvider`, com o adaptador `sandbox` para dev, CI e homologação. A Koovela não usa recursos próprios e cobra uma taxa versionada no back-office.

- **Estabelecimento**:
  - agenda de recebíveis dos pagamentos feitos pela Koovela;
  - simulação de 10 minutos com bruto, taxas, líquido, CET (taxa interna de retorno mensal) e data do crédito;
  - confirmação com reautenticação e idempotência, com reconsulta quando o parceiro não responde a tempo;
  - recebíveis marcados como cedidos.
- **Colaborador**: antecipa só a parte paga por split com liquidação futura de um extrato aprovado (018), e só se o Proprietário permitir. O Proprietário vê o valor, nunca as taxas. Ajustes negativos vão para o período futuro.
- **Estornos e chargebacks** de pagamentos cedidos são descontados dos próximos recebíveis. O que não couber vira saldo devedor, que bloqueia novas antecipações.
- **Livro de dupla entrada** da 012 com soma zero, provada por testes de propriedade, e conciliação diária com alerta no mesmo dia.
- **Desligada em produção** até haver contrato com o parceiro e parecer regulatório registrados na configuração (PEN-28). O escopo do parecer libera estabelecimento, colaborador PJ e colaborador CLT separadamente.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**:
- Fastify 5, Zod e Kysely.
- `packages/platform/advances` (porta e adaptador `sandbox`).
- `packages/domain/advances` (CET, seleção de recebíveis e cálculo de descontos, como funções puras).
- Livro, idempotência, recebedores e webhooks da 012; extratos da 018; flags e aprovação dupla da 004; reautenticação da 003.
- `fast-check` para os testes de propriedade.

**Storage**:
- Schema do tenant: `finance_*` e as contas novas no livro da 012.
- `koovela_platform`: `finance_advance_config_version` e `finance_koovela_fee_ledger`.
- RabbitMQ `finance.events`.

**Testing**:
- Propriedade do equilíbrio do livro em antecipação, estorno, chargeback, liquidação e repasse.
- Idempotência em repetições e tempo esgotado.
- CET com casos de referência.
- Elegibilidade (cada motivo); comissão só de extrato aprovado.
- Autorização: o Proprietário não vê os custos do colaborador.
- Interface: nada pré-selecionado e nenhuma urgência.
- Interruptor de `prod`; conciliação com divergência; axe AA.

**Target Platform**: `core` (`finance`), `workers` (agenda, reconsulta, conciliação, descontos), `tenant-web` (+ `/pro`), `pro-mobile` e `admin-web`.

**Project Type**: integração financeira com porta de parceiro, livro e telas.

**Performance Goals**:
- Visão geral ≤ 1 s p95, com agenda em cache de até 1 h.
- Simulação ≤ 2 s p95, dependente do parceiro.
- Confirmação síncrona ≤ 5 s ou estado `requested` com reconsulta.

**Constraints**:
- Sem recursos próprios.
- Nada automático.
- Taxas sem valor no código.
- Dados bancários só no recebedor da 012.
- Produção desligada sem contrato e parecer.

**Scale/Scope**: dezenas de antecipações por dia no início; recebíveis de até cerca de 12 meses.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Não se aplica | ✅ N/A |
| G-II | Isolamento | Operação no tenant; configuração e receita globais; recebíveis só do próprio recebedor | ✅ |
| G-III | Dinheiro | Idempotência em toda antecipação; livro de dupla entrada com soma zero; centavos e pontos-base; conciliação diária (CONST III) | ✅ |
| G-IV | Dados pessoais | Sem cópia de dados bancários; aviso de compartilhamento com o parceiro; retenção de 5 anos; Proprietário sem acesso aos custos do colaborador | ✅ |
| G-V | Permissões e auditoria | Reautenticação; opção só do Proprietário; configuração com aprovação dupla; leituras do Fin/Ops auditadas | ✅ |
| G-VI | Rastreabilidade | D38, PEN-28, PEN-14, PEN-11, PEN-06 | ✅ |
| G-VII | Contratos | [advances.openapi.yaml](./contracts/advances.openapi.yaml), [advances-events.asyncapi.yaml](./contracts/advances-events.asyncapi.yaml); porta `AdvanceProvider` | ✅ |
| G-VIII | Testes antes | Propriedade do livro, idempotência, CET | ✅ |
| G-IX | Outbox e idempotência | Webhooks deduplicados; reconsulta sem reenvio | ✅ |
| G-X | Observabilidade | Volume, receita, recusas, dívidas, divergências; alerta no mesmo dia | ✅ |
| G-XI | Figma e a11y | Telas da DF 9.11 a conferir; back-office novo; WCAG AA | ✅ com pendência de protótipo |
| G-XII | Complexidade | Porta de parceiro, no mesmo padrão do PSP | ✅ |

**Reavaliação pós-design**: mantida. As extensões em 012 (contas do livro) e 018 (`advanced_cents`) são aditivas.

## Project Structure

### Documentation (this feature, local only)

```text
specs/036-antecipacao-recebiveis/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── advances.openapi.yaml
    └── advances-events.asyncapi.yaml
```

### Source Code (repository root)

```text
packages/platform/advances/                  # AdvanceProvider + adaptador sandbox
packages/domain/advances/                    # CET (TIR), seleção de recebíveis, descontos
services/finance/src/advances/{schedule,eligibility,quotes,requests,commission,clawback,debt,reconciliation,config}/
services/workers/src/finance/{schedule-sync,status-recheck,reconcile-daily,clawback}/
apps/tenant-web/src/routes/financeiro/antecipacao
apps/tenant-web/src/routes/pro/antecipar-comissao
apps/pro-mobile/app/antecipar-comissao
apps/admin-web/src/routes/finance/antecipacao
```

**Structure Decision**: o `finance` é um domínio novo, com o submódulo `advances`. Ele escreve no livro da 012 só pela API do livro e lê a 018 por contrato. O parceiro fica atrás de uma porta, como o PSP.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Parceiro e parecer (PEN-28)**: bloqueiam a produção. A antecipação de comissão para colaborador CLT tem o maior risco regulatório e trabalhista, e só deve ser liberada se o parecer cobrir esse caso.
- **Parte manual da comissão** (paga fora do split): não é antecipável, porque o parceiro só recebe por cessão de recebível registrado. O colaborador vê esse valor como "não antecipável".
- **Receita da Koovela repassada pelo parceiro**: depende do contrato. Se o parceiro não repassar, a alternativa é cobrar a taxa como item de uso na fatura do tenant (019).
- **Telas**: as da DF 9.11 precisam ser conferidas. A opção "permitir antecipação de comissão" e o back-office não estão no protótipo.
