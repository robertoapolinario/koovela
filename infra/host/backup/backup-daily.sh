#!/bin/sh
# Dump diário do MySQL (MySQL Shell util.dumpInstance) cifrado com restic na OCI e no R2 (REQ-FND-050/051).
# Só é `completed` quando a cópia externa (R2) termina (data-model §1.3).
. /usr/local/bin/lib.sh
DAY=$(date -u +%Y-%m-%d)
DIR=/srv/koovela/backup/dump-$DAY
KIND_TAGS="--tag kind=daily"
[ "$(date -u +%d)" = 01 ] && KIND_TAGS="$KIND_TAGS --tag kind=monthly"
trap 'write_metrics daily 0 0; log_event platform.backup.failed.v1 "{\"kind\":\"daily\",\"date\":\"$DAY\"}"; rm -rf "$DIR"' EXIT INT TERM
rm -rf "$DIR"; mkdir -p "$(dirname "$DIR")"
log_event platform.backup.started.v1 "{\"kind\":\"daily\",\"date\":\"$DAY\"}"

mysqlsh --no-wizard --uri "root@127.0.0.1:3306" --passwords-from-stdin --js \
  -e "util.dumpInstance('$DIR', {threads: 2, consistent: true, compression: 'zstd', ocimds: false})" < $S/mysql_root_password

# Manifesto exato por tabela no instante do dump (contagem + CHECKSUM TABLE), usado pelo teste de restauração.
MYSQL="mysql -h 127.0.0.1 -uroot -p$(cat $S/mysql_root_password) -N"
$MYSQL -e "SELECT CONCAT(table_schema,'.',table_name) FROM information_schema.tables WHERE table_schema LIKE 'koovela\\_%' AND table_type='BASE TABLE'" |
while read -r t; do
  printf '%s\t%s\t%s\n' "$t" "$($MYSQL -e "SELECT COUNT(*) FROM $t")" "$($MYSQL -e "CHECKSUM TABLE $t" | cut -f2)"
done > "$DIR/koovela-manifest.tsv"

SIZE=$(du -sb "$DIR" | cut -f1)
with_oci restic backup --quiet --host "$KOOVELA_ENV-db" $KIND_TAGS --tag "date=$DAY" "$DIR"
with_r2 restic backup --quiet --host "$KOOVELA_ENV-db" $KIND_TAGS --tag "date=$DAY" "$DIR"

trap - EXIT INT TERM
rm -rf "$DIR"
write_metrics daily 1 "$SIZE"
log_event platform.backup.completed.v1 "{\"kind\":\"daily\",\"date\":\"$DAY\",\"size_bytes\":$SIZE,\"destinations\":[\"oci-object-storage\",\"cloudflare-r2\"]}"
