# SPA tenant-web (nginx sem root). Base por digest.
FROM node@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS build
WORKDIR /src
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @koovela/tenant-web build

# nginxinc/nginx-unprivileged:1.31.7-alpine
FROM nginxinc/nginx-unprivileged@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e
# Patches de segurança da distro publicados depois do digest base (portão Trivy do CI).
USER root
RUN apk upgrade --no-cache
# UID do usuário nginx da imagem unprivileged: o processo nunca roda como root.
USER 101
COPY infra/compose/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/apps/tenant-web/build/client/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
