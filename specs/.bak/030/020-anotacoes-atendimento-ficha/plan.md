# Implementation Plan: Anotações de atendimento e ficha do consumidor

**Branch**: `020-anotacoes-atendimento-ficha` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/020-anotacoes-atendimento-ficha/spec.md`

## Summary

Criar no `engagement`:

- **`care_notes`** (isolado): consentimento destacado dado só pelo consumidor (app, web, link ou OTP no balcão); anotações do Colaborador do atendimento (até 7 dias após a conclusão, 5.000 caracteres, 5 fotos), editáveis por 24 h e depois só adendos; alertas de cuidado; **cifragem por envelope** com chave fora do banco, sem busca por texto; leitura conforme PEN-10 com auditoria de cada acesso e matriz testada inclusive em sessão de suporte; retenção de 5 anos (PEN-05) por crypto-shredding; contratos de exportação e eliminação para a 022.
- **`records`**: ficha do consumidor por projeção (histórico, faltas, séries, saldos, pontos, avaliações, indicativo de alerta), preferências não sensíveis, base com filtros ≤ 2 s para 10 mil, Gerente da própria filial (PEN-03) e exportação só do Proprietário com step-up.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/crypto` (envelope, AES-256-GCM, OCI Vault), `packages/platform/audit`, `packages/platform/media` (upload de fotos); contratos de 003, 007, 009, 011.

**Storage**: schema do tenant (`care_*`, `records_*`); Object Storage para fotos cifradas; RabbitMQ `engagement.events`.

**Testing**: matriz por célula (incluindo Suporte e SRE em sessão de suporte); consentimento obrigatório; janela de 7 dias e edição de 24 h; segurança (conteúdo nunca em claro no banco, em log, em evento, em índice); retenção e crypto-shredding; desempenho da base (10 mil, ≤ 2 s); isolamento; axe em P11, K02, KD2 e telas de consentimento.

**Target Platform**: `core` (APIs), `workers` (projeção da ficha, retenção, contratos da 022), painel, app e desktop do colaborador, app e web do consumidor.

**Project Type**: submódulos de domínio com dados sensíveis + telas em quatro superfícies.

**Performance Goals**: base com filtros ≤ 2 s para 10 mil consumidores; leitura de anotações ≤ 500 ms p95 (inclui decifragem).

**Constraints**: conteúdo nunca em evento, log, índice ou resposta cacheável; acesso só pelo serviço `care_notes`; Suporte e SRE nunca leem.

**Scale/Scope**: até 10 mil consumidores por negócio; anotações em saúde em quase todo atendimento.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Sem escrita de agenda | ✅ N/A |
| G-II | Isolamento | Schema do tenant; ficha só do negócio | ✅ |
| G-III | Dinheiro | Só leitura de gasto (projeção) | ✅ N/A |
| G-IV | Dados pessoais e sensíveis | Consentimento destacado com evidência; cifragem por envelope; sem busca; retenção de 5 anos com crypto-shredding; eventos sem conteúdo; contratos de titular para a 022 | ✅ |
| G-V | Permissões e auditoria | Células próprias testadas uma a uma, inclusive em sessão de suporte; toda leitura auditada sem conteúdo; exportação com step-up | ✅ |
| G-VI | Rastreabilidade | PEN-05, PEN-10, PEN-03 decididos | ✅ |
| G-VII | Contratos | [care-records.openapi.yaml](./contracts/care-records.openapi.yaml), [care-records-events.asyncapi.yaml](./contracts/care-records-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Matriz, segurança, retenção | ✅ |
| G-IX | Outbox | Eventos só com ids; projeções idempotentes | ✅ |
| G-X | Observabilidade | Leituras de anotação por papel (sem conteúdo) e falhas de decifragem | ✅ |
| G-XI | Figma, a11y | P11, K02, KD2; consentimento e leitura pelo consumidor a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Submódulo isolado justificado abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/020-anotacoes-atendimento-ficha/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── care-records.openapi.yaml
    └── care-records-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/engagement/src/care-notes/{consent,notes,addenda,photos,alerts,access,retention,holder-data}/
services/engagement/src/records/{base,record,profile,projection,export}/
packages/platform/crypto/                    # envelope (se ainda não existir pela 017)
apps/tenant-web/src/routes/clients           # P11 + ficha + anotações
apps/pro-mobile · tenant-web/pro             # K02 · KD2 (anotação e alerta no check-out)
apps/consumer-mobile · consumer-web          # consentimento · anotações no histórico
```

**Structure Decision**: `care_notes` como submódulo isolado do `engagement`, com acesso só pelo próprio serviço; `records` como leitura agregada por projeção.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Submódulo `care_notes` isolado, com cifragem por registro (crypto-shredding) | Conteúdo possivelmente de saúde (dado sensível, LGPD art. 11); eliminação garantida inclusive em backups | Tabela comum com cifragem do banco (não impede leitura por quem acessa o banco; backups guardariam o conteúdo) |

## Riscos e pendências

- **"Profissionais que atendem o cliente"**: decidido em 2026-11-27 — agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses (research R2).
- **Retenção vencida** (`[C4]`): ao fim dos 5 anos, o Proprietário decide pela fila da 022 (eliminar ou manter com justificativa); sem resposta em 30 dias (prazo no back-office), a chave é apagada.
- **Telas a conferir**: pedido de consentimento destacado e leitura das anotações pelo consumidor (provavelmente novas).
- **Prontuário oficial**: fica com o estabelecimento, fora da plataforma (aviso na tela).
