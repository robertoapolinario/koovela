#!/bin/sh
# Funções comuns dos scripts de backup (host de dados). Segredos só de /etc/koovela/secrets.
set -eu
S=/etc/koovela/secrets
. /etc/koovela/data.env   # KOOVELA_ENV, OCI_S3_ENDPOINT, OCI_BUCKET, R2_ENDPOINT, R2_BUCKET
export RESTIC_PASSWORD_FILE=$S/restic_password
METRICS=/var/lib/koovela/metrics
mkdir -p "$METRICS"

# Dois repositórios restic: Object Storage da OCI (cópia local) e Cloudflare R2 (cópia externa, obrigatória).
repo_oci() { echo "s3:${OCI_S3_ENDPOINT}/${OCI_BUCKET}/restic"; }
repo_r2() { echo "s3:${R2_ENDPOINT}/${R2_BUCKET}/restic-${KOOVELA_ENV}"; }
with_oci() { AWS_ACCESS_KEY_ID=$(cat $S/oci_s3_access_key_id) AWS_SECRET_ACCESS_KEY=$(cat $S/oci_s3_secret_access_key) RESTIC_REPOSITORY=$(repo_oci) "$@"; }
with_r2() { AWS_ACCESS_KEY_ID=$(cat $S/r2_access_key_id) AWS_SECRET_ACCESS_KEY=$(cat $S/r2_secret_access_key) RESTIC_REPOSITORY=$(repo_r2) "$@"; }

# Métricas para o node-exporter (textfile): status, último sucesso e tamanho, por tipo.
write_metrics() { # kind status(1|0) size_bytes
  f="$METRICS/backup_$1.prom"
  last_ok=$(grep -s "koovela_backup_last_success_timestamp_seconds" "$f" | awk '{print $2}' || true)
  [ "$2" = 1 ] && last_ok=$(date +%s)
  {
    echo "koovela_backup_last_status{kind=\"$1\"} $2"
    echo "koovela_backup_last_success_timestamp_seconds{kind=\"$1\"} ${last_ok:-0}"
    echo "koovela_backup_size_bytes{kind=\"$1\"} ${3:-0}"
  } > "$f.tmp" && mv "$f.tmp" "$f"
}

log_event() { # event_type json-data
  printf '{"event_type":"%s","at":"%s","environment":"%s","data":%s}\n' "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$KOOVELA_ENV" "$2" | systemd-cat -t koovela-backup
}
