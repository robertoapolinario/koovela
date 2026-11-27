#!/bin/sh
# Uso do R2 (plano gratuito: 10 GB) com aviso em 80% (REQ-FND-048) → textfile do node-exporter.
. /usr/local/bin/lib.sh
R2_FREE_BYTES=${R2_FREE_BYTES:-10000000000}
BYTES=$(with_r2 restic stats --mode raw-data --json | jq '.total_size')
{
  echo "koovela_backup_r2_bytes $BYTES"
  echo "koovela_free_tier_usage_ratio{service=\"r2\"} $(echo "$BYTES $R2_FREE_BYTES" | awk '{printf "%.4f", $1/$2}')"
} > "$METRICS/r2.prom.tmp" && mv "$METRICS/r2.prom.tmp" "$METRICS/r2.prom"
