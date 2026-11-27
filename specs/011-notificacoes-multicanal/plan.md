# Implementation Plan: Notificações multicanal

**Branch**: `011-notificacoes-multicanal` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-notificacoes-multicanal/spec.md`

## Summary

Criar o domínio `notification`:

- **política de canais** configurável pela Gestão, com padrão push → SMS → e-mail → WhatsApp (decisão do C1/PEN-25) e sempre a central de avisos;
- **canais**: Expo Push e Web Push gratuitos, e-mail no plano gratuito do Resend, SMS e WhatsApp pagos pelo tenant com cota e excedente;
- **catálogo de avisos** com idempotência e conferência do estado atual;
- **lembretes**: até 3 por agendamento, com horário de silêncio e reprogramação;
- **link de gestão** sem login, com OTP para remarcar e cancelar;
- **preferências** por grupo e descadastro em um clique;
- **equipe** avisada em tempo real;
- **operação**: registro de entrega por canal, troca automática de provedor, limites de SMS, medição de custo para a fatura e marca de lembrete entregue para a métrica de no-show.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; `expo-server-sdk` (push), `web-push` (VAPID), MJML (e-mail), i18next; adaptadores `EmailSender` (Resend), `SmsProvider` (003), `WhatsAppProvider` (Cloud API, atrás de flag).

**Storage**: `koovela_platform` (catálogo, modelos, política, limites); `koovela_identity` (preferências, destinos, central de avisos); schema do tenant (mensagens, entregas, lembretes, link de gestão, uso diário); RabbitMQ (`notification.events`, filas de envio por canal com DLQ).

**Testing**: idempotência e eventos fora de ordem; horário de silêncio por fuso; reprogramação; link (sem login, OTP, 404, limite por IP); PII nos avisos; troca de canal e de provedor; limites; isolamento; axe em C18, W20, P26 e nas telas novas.

**Target Platform**: `workers` (consumidores, *poller* de lembretes, envio por canal), `core` (APIs), `gateway` (link de gestão, limite por IP), apps e webs.

**Project Type**: domínio de serviço com integrações externas + telas no consumidor, no painel e no back-office.

**Performance Goals**: confirmação ≤ 1 min p95 após o evento; lembrete ≤ 2 min p95 do horário; aviso à equipe ≤ 1 min.

**Constraints**: nenhum aviso de agendamento só por push; sem dado sensível no conteúdo; WhatsApp nunca para promoção; e-mail só de `mail.koovela.com`; R$ 0 em push, Web Push e e-mail até a cota; SMS e WhatsApp pagos pelo tenant.

**Scale/Scope**: 50 mil agendamentos/mês × (1 confirmação + 2 lembretes) ≈ 150 mil avisos/mês, maioria por push.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Lembretes acompanham as transições; link de gestão executa pela 009 com a política | ✅ N/A |
| G-II | Isolamento | Registro por tenant; preferências e central globais por consumidor; nenhum tenant vê avisos de outro | ✅ |
| G-III | Dinheiro | Sem valores; consumo medido para a fatura da 019 | ✅ N/A |
| G-IV | Dados pessoais | Conteúdo sem dado sensível; serviço discreto; descadastro em um clique; destinos são referências à conta da 003 | ✅ |
| G-V | Permissões e auditoria | Modelos, política e limites só pela Gestão, auditados; avisos de segurança não desligam | ✅ |
| G-VI | Rastreabilidade | C1/PEN-25 e custo do SMS decididos; contradição do WhatsApp resolvida na spec | ✅ |
| G-VII | Contratos | [notification.openapi.yaml](./contracts/notification.openapi.yaml), [notification-events.asyncapi.yaml](./contracts/notification-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Idempotência, silêncio, reprogramação, link, PII | ✅ |
| G-IX | Outbox, idempotência, DLQ | Consumidores idempotentes por evento + destinatário + canal; filas de envio com DLQ | ✅ |
| G-X | Observabilidade | Entrega por canal, taxa de falha por provedor, consumo e cota | ✅ |
| G-XI | Figma, a11y | C18, W20, P26, K05, KD5; link de gestão, central e telas do back-office sem código (ver Riscos) | ✅ com pendência de protótipo |
| G-XII | Complexidade | *Poller* em tabela em vez de *delayed exchange*; adaptadores, não serviços próprios | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/011-notificacoes-multicanal/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── notification.openapi.yaml
    └── notification-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/notification/
├── src/{catalog,policy,dispatch,reminders,manage-link,preferences,inbox,delivery,usage,templates}/
└── migrations/
packages/platform/{email,sms,whatsapp,push}/   # adaptadores
apps/consumer-mobile · consumer-web            # C18 · W20 · central de avisos · página do link (/a/{token})
apps/tenant-web/src/routes/settings/notifications   # P26
apps/admin-web/src/routes/notifications             # modelos, política de canais, limites (novas)
```

**Structure Decision**: domínio `notification`, com consumidores e envio no `workers` e APIs no `core`; adaptadores de canal em `packages/platform`.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Cota gratuita de e-mail** (100/dia no Resend): suficiente no início; antes de chegar a 80% (alerta da T054), avaliar alternativas sem custo e só então decidir plano pago.
- **Custo de SMS e WhatsApp** (decisão de 2026-11-26): exceção à regra de R$ 0, como o SMS de OTP da 003, com custo repassado ao tenant (cota no plano e excedente na fatura, spec 019).
- **WhatsApp**: atrás de flag até definir a cota e o preço por plano; usa só modelos de utilidade aprovados pela Meta.
- **Telas sem código no Figma**: página do link de gestão, central de avisos e telas do back-office (modelos, política de canais, limites e custos).
- **Ajuste feito na spec**: REQ-NOT-005, REQ-NOT-001 e o "fora do escopo" foram alinhados à decisão do clarify. WhatsApp é proibido em campanhas e permitido só como canal transacional, conforme a CONST 5.
- **Registro de decisões**: anotar a revisão da `[D10]`.
