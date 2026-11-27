#!/bin/sh
# Roda os testes bats num contêiner com bats + jq.
set -eu
DIR=$(cd "$(dirname "$0")/.." && pwd)
docker build -q -t koovela-bats - >/dev/null <<'DOCKER'
FROM bats/bats:1.13.0@sha256:6e4b9369468b7f3fd8f402ac6cc8ea7b2e4903eae28d08785f31a0245eb51a44
RUN apk add --no-cache jq coreutils
DOCKER
exec docker run --rm -v "$DIR":/code -w /code koovela-bats __tests__/deploy.test.sh
