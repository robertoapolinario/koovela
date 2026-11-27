#!/bin/sh
# Copia os segredos do OCI Vault para /etc/koovela/secrets (Docker secrets) — REQ-FND-081.
# Autenticação por instance principal: nenhuma credencial no host nem no repositório.
# A pasta é um tmpfs: os segredos ficam só em memória e somem no reboot (a sincronização roda no boot).
# Lista de segredos: /etc/koovela/secrets.list (nome por linha; OCID em /etc/koovela/secrets.ocids "nome ocid").
set -eu
DIR=/etc/koovela/secrets
OCIDS=/etc/koovela/secrets.ocids
[ -f "$OCIDS" ] || { echo "sem $OCIDS" >&2; exit 1; }
umask 077
if ! mountpoint -q "$DIR"; then
  mkdir -p "$DIR"
  mount -t tmpfs -o mode=0750,size=8m,nosuid,nodev,noexec tmpfs "$DIR"
  chgrp docker "$DIR"
fi
changed=0
while read -r name ocid; do
  [ -n "$name" ] || continue
  tmp=$(mktemp)
  oci secrets secret-bundle get --auth instance_principal --secret-id "$ocid" --stage CURRENT \
    --query 'data."secret-bundle-content".content' --raw-output | base64 -d > "$tmp"
  if ! cmp -s "$tmp" "$DIR/$name" 2>/dev/null; then
    mv "$tmp" "$DIR/$name"; chgrp docker "$DIR/$name"; chmod 0640 "$DIR/$name"; changed=1
    echo "segredo atualizado: $name"   # só o nome, nunca o valor
  else
    rm -f "$tmp"
  fi
done < "$OCIDS"
# Segredo novo → recria os contêineres que o usam (rotação, REQ-FND-083).
if [ "$changed" -eq 1 ] && [ -f /var/lib/koovela/images.env ]; then
  docker compose -f /opt/koovela/infra/compose/app-host.yml --env-file /var/lib/koovela/images.env up -d --force-recreate 2>/dev/null || true
fi
