# BackupFailed / BinlogShipStale — backup sem sucesso

**Severidade**: crítico · **Fonte**: `infra/observability/alerts/`

## O que significa

O backup diário falhou, não roda há mais de 26 h, ou os binlogs não são enviados há mais de 1 h (RPO de 1 h em risco).

## Primeiros 10 minutos

1. `journalctl -u koovela-backup-daily -n 200` (ou `koovela-binlog-ship`) no host de dados.
2. Causas comuns: credencial do R2 ou do Object Storage, disco cheio, MySQL fora.
3. Rode o backup à mão: `sudo systemctl start koovela-backup-daily` e acompanhe.
4. O backup só é `completed` com a cópia externa (R2) concluída.

## Resolver e registrar

- Ao resolver, confirme que o alerta saiu do Alertmanager e que `status.koovela.com` voltou ao normal.
- Se houve impacto para usuários, registre o incidente (início, fim, causa, ação) em `docs/ops/` e avalie a necessidade de comunicar.
