#!/bin/sh
# Retenção (REQ-FND-053, data-model §1.3): 35 diários + 12 mensais; binlogs cobrem os 35 dias.
. /usr/local/bin/lib.sh
for run in with_oci with_r2; do
  $run restic forget --quiet --prune --tag kind=daily --keep-daily 35 --keep-monthly 12
  $run restic forget --quiet --prune --tag kind=binlog --keep-within 35d
  $run restic check --quiet --read-data-subset=1%
done
