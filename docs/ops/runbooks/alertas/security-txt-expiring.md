# SecurityTxtExpiring — security.txt perto de expirar

**Severidade**: warning · **Fonte**: `infra/observability/alerts/`

## O que significa

O `Expires` de `koovela.com/.well-known/security.txt` está a menos de 30 dias.

## Primeiros 10 minutos

1. O `Expires` é gerado no build da web do consumidor: faça um deploy novo (o build renova para +180 dias).

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
