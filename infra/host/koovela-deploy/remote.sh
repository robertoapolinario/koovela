#!/bin/sh
# Executa o koovela-deploy no host de aplicação pelo túnel da Cloudflare (sem porta aberta na OCI).
# Uso (no runner do GitHub): remote.sh <staging|production> <release.json|-> <deploy|promotion|rollback> [approved_by]
set -eu
ENVIRONMENT=$1 MANIFEST=$2 KIND=$3 APPROVED_BY=${4:-}
: "${SSH_HOST:?}" "${SSH_KEY:?}" "${SSH_KNOWN_HOSTS:?}" "${TUNNEL_SERVICE_TOKEN_ID:?}" "${TUNNEL_SERVICE_TOKEN_SECRET:?}"

CLOUDFLARED_VERSION=2026.11.2
if ! command -v cloudflared >/dev/null; then
  curl -fsSL -o /tmp/cloudflared "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-arm64"
  chmod +x /tmp/cloudflared && PATH="/tmp:$PATH"
fi
mkdir -p ~/.ssh && chmod 700 ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/deploy && chmod 600 ~/.ssh/deploy
printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
SSH="ssh -i ~/.ssh/deploy -o StrictHostKeyChecking=yes -o ProxyCommand=\"cloudflared access ssh --hostname %h --service-token-id \$TUNNEL_SERVICE_TOKEN_ID --service-token-secret \$TUNNEL_SERVICE_TOKEN_SECRET\""

if [ "$KIND" = rollback ]; then
  eval "$SSH koovela@$SSH_HOST sudo /usr/local/bin/koovela-deploy --env $ENVIRONMENT --rollback"
else
  eval "$SSH koovela@$SSH_HOST 'cat > /tmp/release.json'" < "$MANIFEST"
  ARGS="--env $ENVIRONMENT --manifest /tmp/release.json --kind $KIND"
  [ -n "$APPROVED_BY" ] && ARGS="$ARGS --approved-by $APPROVED_BY"
  eval "$SSH koovela@$SSH_HOST sudo /usr/local/bin/koovela-deploy $ARGS"
fi
