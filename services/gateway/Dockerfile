# Imagem de produção do processo `gateway` (REQ-FND-020/021). Base por digest, usuário não root.
# Build nativo linux/arm64 no CI (ubuntu-24.04-arm).
FROM node@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS build
WORKDIR /src
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts=false \
 && node tools/build/bundle.ts services/gateway/src/main.ts /out/main.mjs

FROM node@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530
# Patches de segurança da distro publicados depois do digest base (portão Trivy do CI); o npm,
# o corepack e o yarn embutidos na imagem não são usados em runtime e saem da superfície de ataque.
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/* \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/ /app/
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/livez').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["node", "--enable-source-maps", "/app/main.mjs"]
