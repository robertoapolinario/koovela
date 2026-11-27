# Imagem de ferramentas de desenvolvimento: Node 24 + pnpm (corepack) + Docker CLI e Compose v2.
# Usada por tools/dev/kn quando o host não tem Node instalado.
FROM docker@sha256:4e60c31615e83523afbb59773b25d055c0da9edcd5f80a4c6a6eebad49de1a25 AS docker
FROM node@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530
COPY --from=docker /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker /usr/local/libexec/docker/cli-plugins/ /usr/local/libexec/docker/cli-plugins/
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates curl && rm -rf /var/lib/apt/lists/* \
 && git config --system --add safe.directory '*' \
 && corepack enable && corepack prepare pnpm@10.34.9 --activate
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
