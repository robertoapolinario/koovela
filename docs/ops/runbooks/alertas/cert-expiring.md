# OriginCertExpiring — certificado perto de expirar

**Severidade**: warning · **Fonte**: `infra/observability/alerts/`

## O que significa

Um certificado visto pela varredura de borda expira em menos de 30 dias.

## Primeiros 10 minutos

1. Certificados de borda são da Cloudflare (renovação automática): se for um deles, abra chamado na Cloudflare.
2. Se for o certificado de origem do túnel, renove pelo painel do Zero Trust.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
