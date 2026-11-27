# Restauração do banco (US6 — RPO 1 h, RTO 4 h)

## O que existe

| Item | Onde | Frequência |
|---|---|---|
| Dump completo (`util.dumpInstance`, zstd) + manifesto (contagem e `CHECKSUM TABLE` por tabela) | restic na OCI e no **R2** | diário 05:30 UTC (`koovela-backup-daily.timer`) |
| Binlogs fechados | restic na OCI e no R2 | a cada 15 min (`koovela-binlog-ship.timer`) |
| Retenção | 35 diários + 12 mensais; binlogs 35 dias | semanal (`koovela-backup-retention.timer`) |

Tudo cifrado pelo restic (senha `restic_password` no OCI Vault). O backup só conta como `completed` com a cópia
no R2 concluída.

## Restaurar para um instante (produção)

1. **Declare o incidente** e coloque a página de status em manutenção (`status-page.md`).
2. Pare a escrita: `docker compose -f app-host.yml stop core workers` no host de aplicação.
3. No host de dados, rode o mesmo procedimento do teste (sem o contêiner descartável):
   ```sh
   . /usr/local/bin/lib.sh
   with_r2 restic snapshots --tag kind=daily          # escolha o dump anterior ao instante
   with_r2 restic restore <id> --target /srv/koovela/restore
   with_r2 restic restore latest --tag kind=binlog --target /srv/koovela/restore/binlog
   ```
4. Restaure num MySQL novo (volume novo), carregue com `util.loadDump(..., {skipBinlog: true})` e aplique os
   binlogs com `mysqlbinlog --exclude-gtids=<gtidExecuted do @.json> --stop-datetime='<instante>'`.
5. Confira o manifesto (contagens e `CHECKSUM TABLE`) e só então aponte o MySQL de produção para o volume restaurado.
6. **Replay de eliminações (spec 022 — placeholder)**: antes de liberar a escrita, reaplique os pedidos de
   eliminação de titulares registrados depois do instante restaurado (fila de eliminações da 022). Até a 022
   existir, este passo é vazio.
7. Suba `core` e `workers`, confira `/v1/health` e encerre a manutenção.

## Teste mensal (obrigatório)

`nightly.yml` (dia 3) entra no `db-stg-01` e roda `koovela-restore-test.service`
(`pnpm ops:restore-test --env staging --point <instante>`): restaura **do R2**, confere o manifesto, aplica os
binlogs, mede a duração e grava `docs/ops/restore-tests/AAAA-MM.md` (abre um PR para revisão do SRE).
O alerta `RestoreTestStale` dispara se o último teste tiver mais de 35 dias.
