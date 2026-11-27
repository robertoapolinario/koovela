# Quickstart de validação: Fundação da plataforma (001)

Roteiro para provar, de ponta a ponta, que a base funciona. Cada bloco aponta a história da [spec](./spec.md) que valida. Comandos e caminhos seguem o [plano](./plan.md); contratos em [contracts/](./contracts/).

## Pré-requisitos

- macOS Intel com Homebrew, `git`, Node.js 24 (via `fnm` ou `nvm`, lendo `.nvmrc`), `corepack` (habilita `pnpm` 10), Colima + Docker CLI + Compose v2 (ou Docker Desktop), 8 GB de RAM livres e 20 GB de disco.
- Para staging e produção: acesso às duas contas OCI, ao Cloudflare de `koovela.com`, ao GitHub (repositório público) e ao app **ntfy** no celular.

## 1. Ambiente local com um comando (História 1)

```bash
git clone https://github.com/robertoapolinario/koovela.git && cd koovela
cp .env.example .env            # valores locais já preenchidos por padrão
corepack enable && pnpm install
pnpm koovela up                 # sobe tudo, migra, carrega a semente sintética
```

Esperado:
- termina em até 15 min na primeira vez e 3 min nas seguintes, com a lista de componentes saudáveis;
- `http://koovela.localhost`, `http://app.koovela.localhost`, `http://painel.koovela.localhost`, `http://painel.koovela.localhost/pro` e `http://admin.koovela.localhost` mostram os shells com a navegação de [shell-navigation.json](./contracts/shell-navigation.json);
- `curl -s http://api.koovela.localhost/v1/health` responde conforme [gateway.openapi.yaml](./contracts/gateway.openapi.yaml) com `status: "ok"`.

Falhas esperadas:
- `docker stop koovela-mysql && pnpm koovela up` → sai com erro citando `mysql` (cenário 1.5);
- `pnpm koovela reset` → volta ao estado inicial; rodar duas vezes gera os mesmos dados (cenário 1.4).

## 2. Portões de PR (História 2)

Abrir um PR de teste por portão, a partir de `000-teste-portoes`:

| PR de teste | Esperado |
|---|---|
| Erro de tipo | `typecheck` falha |
| Teste de integração quebrado | `test:integration` falha (MySQL, Redis, RabbitMQ reais) |
| Contrato alterado de forma incompatível sem `/v2` | `contracts:breaking` falha |
| Arquivo com token falso | `secrets` (gitleaks) falha |
| Imagem `node:latest` ou dependência sem lockfile | `pins` falha |
| Cor `#B5532F` escrita num componente | `lint` falha (`no-raw-design-values`) |
| Commit fora de Conventional Commits | `commitlint` falha |

Em todos, o botão de merge fica bloqueado, inclusive para o administrador. Um PR limpo de um domínio termina em até 15 min. Lint de spec (local): `pnpm spec:lint` numa spec sem fase falha com a linha.

## 3. Build, staging, promoção e rollback (História 3)

1. Fazer merge de uma mudança visível (por exemplo, texto do shell).
2. Conferir o workflow `deliver`: imagens `linux/arm64` com digest, SBOM, assinatura cosign e release `AAAA.MM.DD-sha7`.
3. Em até 20 min, `curl -s https://api.staging.koovela.com/v1/health` mostra a nova `version`.
4. Rodar o workflow `promote` com a versão; aprovar no *environment* `production`; conferir o registro de deploy com quem aprovou.
5. Rodar `rollback` (workflow ou `koovela-deploy --rollback` no host); a versão anterior volta em até 10 min.
6. Tentar subir no host uma imagem sem assinatura do pipeline → `koovela-deploy` recusa.

## 4. Borda koovela.com (História 4)

```bash
pnpm ops:edge-scan --env staging     # e --env production
```

Confere, para cada endereço da CONST 3: resolução, TLS, HSTS com `preload`, CSP, `X-Frame-Options: DENY`, `www` → apex com 301, `noindex` em staging e em `admin`, `parceiros` reservado. Sem login do Cloudflare Access, `admin` e `bi` respondem com a tela do Access; acima do limite, `api` responde 429.

## 5. Observabilidade, alertas e status (História 5)

1. `curl -H "X-Correlation-Id: <uuid>" https://api.staging.koovela.com/v1/health?ping=1` → no Grafana, buscar o `correlation_id` e ver logs e trace passando por gateway, core e a fila `platform.example`.
2. `pnpm test:pii` → injeta CPF, telefone, e-mail, cartão, JWT e senha em logs, traces e erros; falha se algum aparecer em claro.
3. Parar o processo `core` em **produção** numa janela combinada → push crítico no ntfy em até 5 min; sem silenciar, novo push em 15 min.
4. Parar algo só em staging à noite → nenhum push; e-mail no próximo horário comercial.
5. Publicar mensagens inválidas em `platform.example` → DLQ cresce → alerta.
6. `status.koovela.com` responde mesmo com os hosts desligados (Upptime no GitHub Pages).

## 6. Backup e restauração (História 6)

```bash
pnpm ops:restore-test --env staging --point "2026-12-01T13:37:00-03:00"
```

Restaura a partir do Cloudflare R2, confere contagens e somas, mede a duração (≤ 4 h) e grava `docs/ops/restore-tests/AAAA-MM.md`. Desligar o envio ao R2 → alerta de backup.

## 7. Tokens e shells (História 7)

Trocar `color.brand.terracota` em `packages/design-tokens`, rodar `pnpm build` e conferir os cinco shells (web e nativos) com a nova cor, sem outro arquivo alterado. `pnpm test:a11y` roda o axe nos shells (zero violações AA).

## 8. Contratos (História 8)

`pnpm contracts:generate` gera `packages/sdk`. Remover um campo obrigatório de `Health` sem nova versão → `pnpm contracts:breaking` falha.

## 9. Segredos, e-mail e security.txt (História 9)

- `pnpm secrets:scan --history` → zero achados.
- Usar `getConfig('NOVA_CHAVE')` sem atualizar `.env.example` → `pnpm env:check` falha.
- `dig TXT mail.koovela.com`, `_dmarc.mail.koovela.com`, `news.koovela.com` → SPF, DKIM e DMARC `p=quarantine`.
- `curl https://koovela.com/.well-known/security.txt` → `Contact: mailto:seguranca@koovela.com` e `Expires` futuro.

## 10. Links universais (História 10)

- Android com o app do teste interno do Google Play: tocar em `https://koovela.com/teste-sintetico` → abre o app no shell com o slug. Sem o app → abre a web (W07).
- `https://koovela.com/.well-known/assetlinks.json` e `apple-app-site-association` passam na validação de formato.
- `https://koovela.com/nao-existe` → página "não encontrado" com status 404.
