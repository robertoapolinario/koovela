# bi.koovela.com esqueleto (T127): estático com a identidade visual (tokens). Atrás do Access com MFA.
FROM node@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS build
WORKDIR /src
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter @koovela/design-tokens

FROM nginxinc/nginx-unprivileged@sha256:5aea7cc516b419e3526f47dd1531be31a56a046cfe44754d94f9383e13e2ee99
COPY infra/compose/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY apps/bi-placeholder/index.html /usr/share/nginx/html/index.html
COPY --from=build /src/packages/design-tokens/dist/tokens.css /usr/share/nginx/html/tokens.css
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
