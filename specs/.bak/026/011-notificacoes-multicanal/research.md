# Research: Notificações multicanal (011)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 001 (e-mail autenticado, Resend gratuito, Cloudflare), 003 (`SmsProvider`, OTP, preferências na identidade), 009 (eventos de agendamento, SSE), 010 (eventos de multa). Decisão C1/PEN-25 (clarify): sem app → SMS, e-mail, WhatsApp; SMS pago pelo tenant com cota. Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e onde ficam os dados

- **Decisão**: domínio `notification` (CONST 4.4). No schema do tenant: registro de avisos e entregas dos agendamentos daquele tenant, lembretes programados, configuração de lembretes do negócio. Global (`koovela_identity`, tabelas do `notification`): preferências do consumidor e da equipe, destinos de entrega (tokens de push, estado de e-mail e celular), central de avisos do consumidor (REQ-NOT-070). `koovela_platform`: catálogo de tipos de aviso, modelos versionados, política de canais, limites.

## R2. Canais e provedores (R$ 0 onde possível)

| Canal | Decisão | Custo |
|---|---|---|
| Push no app | **Expo Push Service** (gratuito) com os tokens do `expo-notifications`; recibos de entrega consultados | R$ 0 |
| Notificação do navegador | **Web Push** com chaves VAPID próprias | R$ 0 |
| E-mail | Interface `EmailSender`; **Resend** (plano gratuito: 3.000/mês, 100/dia) em `notificacoes@mail.koovela.com`; Mailpit em dev | R$ 0 até a cota |
| SMS | `SmsProvider` da 003 (primário + alternativo) | Pago pelo tenant: cota no plano + excedente (spec 019) |
| WhatsApp | Interface `WhatsAppProvider` (Cloud API da Meta, só modelos de utilidade aprovados), **atrás de flag** até a cota e o preço por plano estarem definidos | Pago pelo tenant, como o SMS |
| Central de avisos | Própria (tabela + `GET /v1/consumer/inbox`) | R$ 0 |

- **Troca automática de provedor** quando a taxa de falha passar de 10% em 5 min, com alerta (REQ-NOT-061). Push não entregue em 10 min → próximo canal (REQ-NOT-006).
- **Risco**: a cota gratuita de e-mail (100/dia) só serve ao início; acima dela o e-mail vira custo do produto e precisa de decisão de plano (não bloqueia o design: há adaptador e métrica de uso com aviso em 80%, REQ-FND-048).

## R3. Política de canais

- **Decisão**: `notification_channel_policy` por tipo ou grupo de aviso, editada pela Gestão: ordem de preferência, condição de cada canal e troca na falha. Padrão (REQ-NOT-003): `push (se há app) → sms → email (verificado) → whatsapp`, sempre com a central de avisos; nenhum aviso de agendamento depende só de push (CONST 8). A revisão da `[D10]` vai para o registro de decisões.

## R4. Catálogo, idempotência e fora de ordem

- **Decisão**: catálogo de tipos (código, evento de origem, destinatários, grupo `essential` \| `reminders` \| `post_service` \| `staff` \| `security`, urgência, canais permitidos, modelo). Consumidor de eventos (`scheduling.*`, `scheduling.policy_fee.*`, `payments.*`…) com chave idempotente `(event_id, destinatário, canal)` (REQ-NOT-031); antes de enviar, confere o estado atual do agendamento pelo contrato da 009 (evita "confirmado" depois de "cancelado"). Outros domínios também pedem avisos por contrato (`POST /v1/internal/notifications`, REQ-NOT-071).

## R5. Lembretes programados

- **Decisão**: `notification_scheduled_reminder` no schema do tenant, criado no `confirmed` e reprogramado ou cancelado em `rescheduled`, `cancelled_*`, `professional_changed` (REQ-NOT-014). Um *poller* no `workers` a cada 30 s pega os vencidos (`SELECT … FOR UPDATE SKIP LOCKED`) e envia; meta ≤ 2 min do horário (REQ-NOT-072). Horário de silêncio 21h–8h no fuso da filial: lembretes não urgentes que cairiam no silêncio são antecipados; o mais próximo (≤ 3 h antes) ignora o silêncio (REQ-NOT-013).
- **Alternativas**: *delayed exchange* do RabbitMQ (plugin extra, mensagens difíceis de reprogramar).

## R6. Conteúdo e privacidade

- **Decisão**: modelos em i18n pt-BR, versionados no back-office, com variáveis tipadas (Zod) e renderização em servidor (MJML para e-mail, texto curto para SMS e WhatsApp com limite de caracteres). Nota do tenant até 140 caracteres só em confirmação e lembrete (REQ-NOT-032). Sem observação, anotação ou dado de saúde; serviço "discreto" → "seu atendimento em {estabelecimento}" (REQ-NOT-033); em saúde, nenhum preço (PEN-06). Agrupamento de avisos não urgentes em 10 min (REQ-NOT-034).

## R7. Link de gestão do agendamento

- **Decisão**: token aleatório de 128 bits (base62), guardado só como hash, ligado ao agendamento, válido até 24 h após o horário, revogável, com limite por IP no gateway (REQ-NOT-023). URL `https://app.koovela.com/a/{token}` (link universal: abre o app se instalado, REQ-NOT-022). Ver e confirmar presença sem OTP; remarcar e cancelar exigem OTP no celular do agendamento (fluxo de OTP da 003, REQ-NOT-021). Página nova (sem código no Figma).

## R8. Preferências e descadastro

- **Decisão**: preferências por grupo e canal (essenciais nunca sem canal: central é o mínimo, REQ-NOT-040); descadastro em um clique por link assinado (HMAC, sem login) no e-mail e no SMS (REQ-NOT-041); cabeçalho `List-Unsubscribe` no e-mail. Modelo já aceita o opt-in de campanhas por canal da 028 (REQ-NOT-042). Equipe escolhe avisos por push e e-mail; avisos de segurança não desligam (REQ-NOT-043).

## R9. Equipe em tempo real

- **Decisão**: avisos à equipe vão ao app do colaborador (push) e ao painel pelo mesmo SSE da 009 (REQ-NOT-050/051), em ≤ 1 min. E-mail diário opcional ao Proprietário com o dia seguinte e os cancelamentos do dia (REQ-NOT-052).

## R10. Entrega, limites e medição

- **Decisão**: `notification_delivery` por canal com `scheduled` → `sent` → `delivered` \| `failed` \| `opened` e motivo (REQ-NOT-060), via *webhooks* dos provedores. Limites diários de SMS por tenant e global (back-office), com alerta; acima, não urgentes adiados ou trocados de canal (REQ-NOT-062). Consumo por tenant e canal para a fatura (019), aviso ao Proprietário em 80% da cota (REQ-NOT-063). Marca no agendamento dos lembretes efetivamente entregues, para a métrica de no-show com e sem lembrete (REQ-NOT-064, CONST 7). Bounce, spam e número inválido suspendem o destino com aviso no perfil (REQ-NOT-065).

## R11. Telas

| Superfície | Tela | Código |
|---|---|---|
| App / web do consumidor | Perfil e notificações | C18 · W20 |
| Painel | Configurações (lembretes, nota, serviços discretos) | P26 |
| App do colaborador / `/pro` | Perfil (preferências) | K05 · KD5 |
| Novas (sem código no Figma) | Página do link de gestão · central de avisos · back-office: modelos, política de canais, limites e custos | Desenhar no protótipo |
