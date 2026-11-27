#!/bin/sh
# Executa um comando num host pelo túnel da Cloudflare (Access com token de serviço). Uso: ssh-exec.sh "<comando>"
set -eu
: "${SSH_HOST:?}" "${SSH_KEY:?}" "${SSH_KNOWN_HOSTS:?}" "${TUNNEL_SERVICE_TOKEN_ID:?}" "${TUNNEL_SERVICE_TOKEN_SECRET:?}"
CLOUDFLARED_VERSION=2026.11.2
if ! command -v cloudflared >/dev/null; then
  curl -fsSL -o /tmp/cloudflared "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-arm64"
  chmod +x /tmp/cloudflared && PATH="/tmp:$PATH"
fi
mkdir -p ~/.ssh && chmod 700 ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/deploy && chmod 600 ~/.ssh/deploy
printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
exec ssh -i ~/.ssh/deploy -o StrictHostKeyChecking=yes \
  -o ProxyCommand="cloudflared access ssh --hostname %h --service-token-id $TUNNEL_SERVICE_TOKEN_ID --service-token-secret $TUNNEL_SERVICE_TOKEN_SECRET" \
  "koovela@$SSH_HOST" "$1"
