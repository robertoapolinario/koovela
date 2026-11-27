#!/usr/bin/env bats
# Testes do koovela-deploy (T049). Rodar: sh __tests__/run-bats.sh

setup() {
  export STATE_DIR="$BATS_TEST_TMPDIR/state"
  mkdir -p "$STATE_DIR"
  export COSIGN="$BATS_TEST_DIRNAME/stubs/cosign" DOCKER="$BATS_TEST_DIRNAME/stubs/docker"
  export COMPOSE_FILE=/dev/null PROCESSES="gateway core"
  D1="sha256:$(printf 'a%.0s' $(seq 64))"; D2="sha256:$(printf 'b%.0s' $(seq 64))"
  export COSIGN_VALID="$D1 $D2"
  BIN="$BATS_TEST_DIRNAME/../koovela-deploy"
  manifest "$BATS_TEST_TMPDIR/v1.json" 2026.11.27-aaaaaaa "$D1"
  manifest "$BATS_TEST_TMPDIR/v2.json" 2026.11.28-bbbbbbb "$D2"
}

manifest() { # file version digest
  cat > "$1" <<JSON
{"version":"$2","commit":"$(printf '0%.0s' $(seq 40))","built_at":"2026-11-27T00:00:00Z",
 "images":[{"service":"gateway","image":"ghcr.io/k/k/gateway","digest":"$3","platform":"linux/arm64"},
           {"service":"core","image":"ghcr.io/k/k/core","digest":"$3","platform":"linux/arm64"}],
 "sbom":"https://example.invalid/sbom.json",
 "signature":{"issuer":"https://token.actions.githubusercontent.com",
              "identity":"https://github.com/k/k/.github/workflows/deliver.yml@refs/heads/main"}}
JSON
}

@test "deploy saudável registra started → verifying_health → succeeded" {
  HEALTH_CMD=true run "$BIN" --env staging --manifest "$BATS_TEST_TMPDIR/v1.json"
  [ "$status" -eq 0 ]
  [ "$(cat "$STATE_DIR/current")" = 2026.11.27-aaaaaaa ]
  run jq -r .status "$STATE_DIR/deploys.jsonl"
  [ "$output" = "$(printf 'started\nverifying_health\nsucceeded')" ]
  grep -q "pull --quiet gateway core" "$STATE_DIR/docker.calls"
  grep -q 'koovela_deploy_last_status{environment="staging",version="2026.11.27-aaaaaaa",kind="deploy"} 1' "$STATE_DIR/metrics/deploy.prom"
}

@test "recusa imagem sem assinatura do deliver.yml da main" {
  COSIGN_VALID="" HEALTH_CMD=true run "$BIN" --env staging --manifest "$BATS_TEST_TMPDIR/v1.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *"assinatura cosign inválida"* ]]
  [ ! -f "$STATE_DIR/current" ]
  [ ! -f "$STATE_DIR/docker.calls" ]
}

@test "recusa manifesto com identidade de outro workflow" {
  sed -i 's#deliver.yml@refs/heads/main#deliver.yml@refs/heads/feature#' "$BATS_TEST_TMPDIR/v1.json"
  HEALTH_CMD=true run "$BIN" --env staging --manifest "$BATS_TEST_TMPDIR/v1.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *"não é o deliver.yml da main"* ]]
}

@test "falha de readiness volta ao manifest anterior" {
  HEALTH_CMD=true "$BIN" --env staging --manifest "$BATS_TEST_TMPDIR/v1.json"
  : > "$STATE_DIR/docker.calls"
  HEALTH_CMD=false run "$BIN" --env staging --manifest "$BATS_TEST_TMPDIR/v2.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *"revertido automaticamente para 2026.11.27-aaaaaaa"* ]]
  [ "$(cat "$STATE_DIR/current")" = 2026.11.27-aaaaaaa ]
  [ "$(readlink "$STATE_DIR/images.env")" = "$STATE_DIR/images.2026.11.27-aaaaaaa.env" ]
  [ "$(tail -1 "$STATE_DIR/deploys.jsonl" | jq -r .status)" = failed ]
}

@test "segundo deploy concorrente é recusado" {
  mkdir "$STATE_DIR/deploy.lock"; echo "999 agora" > "$STATE_DIR/deploy.lock/owner"
  HEALTH_CMD=true run "$BIN" --env staging --manifest "$BATS_TEST_TMPDIR/v1.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *"outro deploy em andamento"* ]]
  [ -d "$STATE_DIR/deploy.lock" ]
}

@test "produção sem aprovação é recusada; com aprovação grava approved_by" {
  HEALTH_CMD=true run "$BIN" --env production --manifest "$BATS_TEST_TMPDIR/v1.json" --kind promotion
  [ "$status" -ne 0 ]
  HEALTH_CMD=true run "$BIN" --env production --manifest "$BATS_TEST_TMPDIR/v1.json" --kind promotion --approved-by sre-a
  [ "$status" -eq 0 ]
  [ "$(tail -1 "$STATE_DIR/deploys.jsonl" | jq -r .approved_by)" = sre-a ]
}

@test "--rollback volta para a versão anterior em um comando" {
  HEALTH_CMD=true "$BIN" --env production --manifest "$BATS_TEST_TMPDIR/v1.json" --kind promotion --approved-by sre-a
  HEALTH_CMD=true "$BIN" --env production --manifest "$BATS_TEST_TMPDIR/v2.json" --kind promotion --approved-by sre-a
  HEALTH_CMD=true run "$BIN" --env production --rollback
  [ "$status" -eq 0 ]
  [ "$(cat "$STATE_DIR/current")" = 2026.11.27-aaaaaaa ]
  [ "$(tail -1 "$STATE_DIR/deploys.jsonl" | jq -r '.kind + " " + .previous_version')" = "rollback 2026.11.28-bbbbbbb" ]
}
