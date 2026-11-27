#!/bin/sh
# pnpm secrets:scan [--history]  (REQ-FND-082)
#   sem flag: arquivos que o Git versionaria (rastreados + novos não ignorados), sem .env nem node_modules
#   --history: todos os commits do repositório
# Usa o gitleaks instalado ou, se não houver, a imagem oficial por digest.
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
IMG=ghcr.io/gitleaks/gitleaks@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f
run() { # dir args...
  d=$1; shift
  if command -v gitleaks >/dev/null 2>&1; then (cd "$d" && gitleaks "$@"); else docker run --rm -v "$d":/repo -v "$ROOT/.gitleaks.toml":/cfg.toml:ro -w /repo "$IMG" "$@"; fi
}
CFG=$( command -v gitleaks >/dev/null 2>&1 && echo "$ROOT/.gitleaks.toml" || echo /cfg.toml )
if [ "${1:-}" = "--history" ]; then
  run "$ROOT" git --no-banner --redact --config "$CFG" .
  exit
fi
TMP=$(mktemp -d "${TMPDIR:-/tmp}/koovela-scan.XXXXXX")
trap 'rm -rf "$TMP"' EXIT
cd "$ROOT"
git ls-files -co --exclude-standard -z | xargs -0 -I{} sh -c 'mkdir -p "$1/$(dirname "$2")" && cp "$2" "$1/$2"' _ "$TMP" {}
run "$TMP" dir --no-banner --redact --config "$CFG" -v .
