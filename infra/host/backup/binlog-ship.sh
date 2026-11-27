#!/bin/sh
# Envia os binlogs fechados a cada 15 min (RPO 1 h) para os dois repositórios restic.
. /usr/local/bin/lib.sh
DATADIR=/srv/koovela/mysql
STAGE=/srv/koovela/binlog-ship
trap 'write_metrics binlog 0 0' EXIT INT TERM
MYSQL="mysql -h 127.0.0.1 -uroot -p$(cat $S/mysql_root_password) -N"
$MYSQL -e "FLUSH BINARY LOGS"
CURRENT=$($MYSQL -e "SHOW BINARY LOG STATUS" | awk '{print $1}')
mkdir -p "$STAGE"
for f in "$DATADIR"/binlog.[0-9]*; do
  b=$(basename "$f")
  [ "$b" = "$CURRENT" ] && continue
  [ -f "$STAGE/$b" ] || cp -p "$f" "$STAGE/$b"
done
with_oci restic backup --quiet --host "$KOOVELA_ENV-db" --tag kind=binlog "$STAGE"
with_r2 restic backup --quiet --host "$KOOVELA_ENV-db" --tag kind=binlog "$STAGE"
# Mantém no stage só os binlogs que o MySQL ainda tem (expira em 35 dias pelo binlog_expire_logs_seconds).
for f in "$STAGE"/binlog.[0-9]*; do [ -f "$DATADIR/$(basename "$f")" ] || rm -f "$f"; done
trap - EXIT INT TERM
write_metrics binlog 1 "$(du -sb "$STAGE" | cut -f1)"
