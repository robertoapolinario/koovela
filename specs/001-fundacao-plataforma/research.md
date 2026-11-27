# Research: Fundação da plataforma Koovela (001)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Cada item segue o formato **Decisão / Por quê / Alternativas**. Restrições que guiaram tudo: custo R$ 0 fora das VMs da OCI (REQ-FND-048), um desenvolvedor (Princípio XII), ARM64 em produção (Princípio X), stack da CONST 4.1.

---

## R1. Hospedagem do código e portões de merge

- **Decisão**: repositório de código **público** no GitHub (decisão do responsável, 2026-11-25), com *rulesets* na `main` (PR obrigatório, checks obrigatórios, sem *bypass* para administrador, histórico linear) e *environments* `staging` e `production` (este com *required reviewers*).
- **Por quê**: no GitHub Free, proteção de branch, *rulesets* e aprovação de ambiente só existem em repositório público; sem eles REQ-FND-011 e REQ-FND-024 não são garantidos pela plataforma. Repositório público também libera runners hospedados sem limite de minutos.
- **Consequências obrigatórias**:
  - nenhum segredo, dado real, documento de negócio ou anotação no repositório (gitleaks em pre-commit e no CI, varredura do histórico inteiro antes de tornar público);
  - `specs/`, `.specify/`, `.claude/` e `bkp/` **fora** do repositório (`bkp/` precisa entrar no `.gitignore`);
  - commits com o e-mail `noreply` do GitHub (o e-mail pessoal não pode aparecer no histórico público);
  - *fork PRs* sem acesso a segredos (`pull_request`, nunca `pull_request_target` com checkout do código do fork); ambientes com segredos só em `push` na `main` e *workflow_dispatch*.
- **Alternativas**: GitHub Pro (~US$ 4/mês; fere o R$ 0); privado com portões "brandos" (não atende REQ-FND-011); Forgejo auto-hospedado (operação demais para um desenvolvedor).

## R2. Specs fora do repositório

- **Decisão**: `specs/`, constituição e Documento Fundamental ficam só locais. O lint de especificação (REQ-FND-012) é um script em `tools/spec-lint`, versionado, que roda em hook `pre-commit` (lefthook) e por `pnpm spec:lint`, lendo `specs/` local quando existe.
- **Por quê**: decisão do responsável (2026-11-25). O script em si não revela conteúdo de negócio.
- **Desvio da constituição**: CONST 4.2 lista `specs/` e `docs/fundamental/` no repositório, e a verificação do Princípio VI fala em "lint de especificação no CI". Registrado em *Complexity Tracking*; exige emenda.
- **Alternativas**: specs públicas; repositório privado separado só para specs.

## R3. Runners de CI e build ARM64

- **Decisão**: runners hospedados do GitHub. `ubuntu-24.04-arm` para build de imagens, testes de integração e verificação ARM64; `macos-latest` apenas para compilar o shell iOS em simulador. Imagens com `docker buildx` nativo em ARM (sem QEMU).
- **Por quê**: gratuitos e sem limite em repositório público; build nativo no mesmo processador da OCI (Ampere).
- **Alternativas**: runner próprio na OCI (risco de segurança em repositório público: código de PR de terceiros roda na sua VM); QEMU em x64 (lento demais para a meta de 15 minutos).

## R4. Monorepo e toolchain

- **Decisão**: `pnpm` 10 (workspaces) + Turborepo 2 + Node.js 24 LTS (fixado em `.nvmrc` e `packageManager`), TypeScript 5.9 `strict`, ESLint 9 (flat config, `typescript-eslint`) + Prettier, Vitest, lefthook para hooks, commitlint (Conventional Commits), verificação de nome de branch `NNN-nome` por script no CI.
- **Por quê**: CONST XII manda `pnpm` + Turborepo; Turborepo dá o "só o afetado" (`--filter=...[origin/main]`) que a meta de 15 min (REQ-FND-015) precisa.
- **Alternativas**: Nx (mais pesado), npm workspaces (sem cache de tarefas).

## R5. Serviços: framework, contratos e clientes gerados

- **Decisão**:
  - HTTP com **Fastify 5** + **Zod** (`fastify-type-provider-zod`); validação gerada a partir do OpenAPI.
  - Contratos em `packages/contracts`: **OpenAPI 3.1** (HTTP), **AsyncAPI 3.0** + JSON Schema 2020-12 (eventos).
  - Geração com **orval**: esquemas Zod para os serviços e clientes `fetch` + hooks TanStack Query para web e React Native, em `packages/sdk`.
  - Quebra de contrato: **oasdiff** (`breaking`) para OpenAPI e `asyncapi diff` (CLI oficial) para AsyncAPI, comparando com a `main`.
  - Teste de provedor: **Schemathesis** contra o gateway em contêiner, no CI.
  - Erros: Problem Details (RFC 9457) com `code` estável e `detail` em pt-BR ([contracts/problem-details.schema.json](./contracts/problem-details.schema.json)).
- **Por quê**: CONST 4.1 (TypeScript strict, Zod gerado do OpenAPI) e Princípio VII (contrato primeiro, SDK gerado). Ferramentas todas gratuitas e auto-hospedáveis no CI.
- **Alternativas**: NestJS (mais cerimônia); tRPC (não gera OpenAPI público); Pact (exige broker).

## R6. Agrupamento de domínios em processos (D44)

- **Decisão**: cada domínio é um pacote em `services/<domínio>` que exporta um *plugin* Fastify e os próprios *consumers*. Três processos implantáveis, montados por configuração (`KOOVELA_DOMAINS`):
  - `gateway` (borda de aplicação, resolução de tenant a partir da spec 002/003);
  - `core` (domínios da v1.0 carregados por lista);
  - `workers` (relay de outbox, consumidores de fila, tarefas agendadas).
  Nesta spec só existem `gateway` e o domínio de exemplo `platform` (saúde e evento de exemplo).
- **Fronteiras**: **dependency-cruiser** no lint proíbe import entre `services/*` (só `packages/*` e `packages/contracts`); cada domínio tem credencial de banco própria (REQ-FND-028).
- **Por quê**: D44 (Compose sem orquestrador, poucos processos) com microsserviços lógicos preservados (CONST 4.4); separar um domínio vira só configuração.
- **Alternativas**: um contêiner por domínio desde já (19+ contêineres em 2 hosts; fere XII).

## R7. Banco, migrações e dados sintéticos

- **Decisão**: MySQL 8.4 LTS (`utf8mb4_0900_ai_ci`, UTC, binlog em formato ROW com GTID); acesso com **Kysely** (query builder tipado, sem ORM) e **um** executor de migrações em `infra/migrations` (multi-schema completado na spec 002). Dados sintéticos com `@faker-js/faker` em `pt_BR`, semente fixa, todo registro marcado `synthetic = true` (REQ-FND-003).
- **Por quê**: CONST 4.1 e Princípio XII (executor único); Kysely não esconde o SQL, o que ajuda no schema por tenant.
- **Alternativas**: Prisma (cliente e migrações por schema complicam o multi-schema), TypeORM.

## R8. Ambiente local (macOS Intel)

- **Decisão**: Docker Compose com **Colima** (gratuito; Docker Desktop também serve). Comando único `pnpm koovela up` (script em `tools/koovela-cli`): verifica pré-requisitos, memória (≥ 8 GB livres) e disco (≥ 20 GB); sobe MySQL, Redis, RabbitMQ, Traefik, gateway, `core` e as superfícies web; aplica migrações; carrega a semente; espera os *healthchecks*; falha com o nome do componente (cenário 1.5). `pnpm koovela reset` volta ao estado inicial. Endereços: `koovela.localhost`, `app.koovela.localhost`, `painel.koovela.localhost`, `admin.koovela.localhost`, `api.koovela.localhost` (Traefik).
- **Por quê**: História 1, CONST X (Compose em desenvolvimento). Imagens locais são `amd64`; imagens de produção nunca saem daqui (D22).
- **Alternativas**: Tilt/Skaffold (exigem Kubernetes), Devbox (não cobre serviços).

## R9. Produção e staging nos hosts OCI

- **Decisão**:
  - Ubuntu 24.04 ARM64; Docker Engine + Compose v2; um arquivo Compose por host (`infra/compose/app-host.yml`, `infra/compose/db-host.yml`) parametrizado por ambiente.
  - `app-prod-01`: Traefik, gateway, core, workers, `cloudflared`.
  - `db-worker-01`: MySQL, Redis, RabbitMQ, pilha de observabilidade (R11), backup (R12). Sem IP público; acesso só pela VCN e por túnel.
  - Staging: mesma topologia em outra conta OCI (`app-stg-01`, `db-stg-01`), mesma descrição como código.
  - Infra como código: **OpenTofu** com os providers OCI e Cloudflare (`infra/tofu/{modules,envs/staging,envs/production}`); estado no OCI Object Storage (Always Free) de cada conta.
- **Por quê**: D44, REQ-FND-023/027/029. OpenTofu é livre e compatível com os providers.
- **Alternativas**: Ansible para tudo (sem estado declarativo de rede), Terraform (licença BSL).

## R10. Borda, domínio e acesso interno

- **Decisão**: **Cloudflare Free**: DNS de `koovela.com`, proxy com TLS, HSTS `preload`, regras gerenciadas gratuitas do WAF, regra de *rate limiting* do plano gratuito no `api.koovela.com`, cabeçalhos de segurança por *Transform Rules*, **Cloudflare Tunnel** (`cloudflared`) como única entrada nas origens (nenhuma porta de entrada aberta na OCI), **Cloudflare Access** (gratuito até 50 usuários) em `admin` e `bi` com IdP GitHub exigindo MFA e, no `admin`, regra de IP. `www` → apex por *Redirect Rule* 301. Staging responde `X-Robots-Tag: noindex` em tudo.
- **E-mail**: recebimento de `suporte@`, `privacidade@`, `seguranca@` por **Cloudflare Email Routing** (gratuito). Envio autenticado de `mail.koovela.com` e `news.koovela.com` com provedor de plano gratuito (Resend: 3.000 mensagens/mês, 100/dia) só para alertas nesta spec; SPF, DKIM e DMARC `p=quarantine` via OpenTofu.
- **Limites a vigiar**: o plano gratuito tem uma única regra de *rate limiting*, sem WAF customizado avançado; se o tráfego exigir mais, o *rate limit* fino é feito também no gateway (Redis).
- **Alternativas**: Nginx exposto com Let's Encrypt (abre porta na OCI), Caddy na origem.

## R11. Observabilidade e alertas (R$ 0)

- **Decisão**: auto-hospedado no `db-worker-01` (e no `db-stg-01`), com limites de memória por contêiner:
  - **OpenTelemetry Collector** (recebe traces, métricas e logs; aplica o mascaramento de segunda linha);
  - **Prometheus** (métricas, 30 dias) e **Alertmanager**;
  - **Loki** (logs, 30 dias de aplicação; 90 dias para a trilha de segurança da borda, exportada da Cloudflare);
  - **Tempo** (traces, 7 dias);
  - **Grafana** (painéis), exposto só por Cloudflare Access.
  - Erros: **Sentry Developer** (gratuito; 5 mil erros/mês, 1 usuário, 30 dias), com mascaramento antes do envio (`beforeSend`); se a cota estourar, os erros continuam nos logs e um aviso é emitido.
  - Push crítico 24x7: **ntfy** (app gratuito no celular; tópico privado com token) recebendo do Alertmanager; `repeat_interval` de 15 minutos até o alerta ser silenciado (= reconhecido). Avisos por e-mail com `time_intervals` de seg. a sex., 9h às 18h, `America/Sao_Paulo`.
  - Monitoramento externo e página de status: **Upptime** num repositório público separado (`koovela-status`), executado pelo GitHub Actions a cada 5 minutos e publicado no GitHub Pages em `status.koovela.com` (fora da OCI). Ele também manda push via ntfy quando a OCI inteira cai (o Alertmanager cairia junto).
- **Mascaramento (REQ-FND-041)**: `pino` com *redact* por nome de campo + serializador por padrão de conteúdo (CPF, telefone, e-mail, cartão, JWT) em `packages/platform/logger`, mais o processador do Collector; teste que injeta cada categoria e falha se aparecer em claro.
- **Por quê**: Grafana Cloud Free guarda logs só 14 dias (a spec pede 30); pilha própria cabe nos 12 GB de RAM do host de dados com limites, e não custa nada.
- **Alternativas**: Grafana Cloud Free (retenção curta), Better Stack Free (10 monitores), VictoriaMetrics/VictoriaLogs (mais leves; ficam como plano B se a memória apertar).

## R12. Backup

- **Decisão**: dump lógico diário com **MySQL Shell** (`util.dumpInstance`, paralelo, comprimido) + envio contínuo dos **binlogs** a cada 15 minutos. Tudo cifrado e deduplicado com **restic** para dois destinos: OCI Object Storage (Always Free, 20 GB, cópia local) e **Cloudflare R2** (gratuito até 10 GB, sem custo de saída) como cópia fora da OCI. Retenção restic: 35 diários + 12 mensais. Teste de restauração mensal automatizado no staging (restaura o dump + binlogs até um instante escolhido, confere contagens e somas de verificação) e registrado em `docs/ops/restore-tests/AAAA-MM.md`.
- **Limite**: se o R2 passar de 8 GB (aviso em 80%), a cópia externa vai para equipamento próprio (REQ-FND-051), sem reduzir retenção.
- **Por quê**: RPO de 1 hora (binlog a cada 15 min dá folga), RTO de 4 horas, R$ 0.
- **Alternativas**: Percona XtraBackup (backup físico, mais rápido para restaurar; avaliar compatibilidade ARM64 + MySQL 8.4 antes de adotar), `mysqldump` puro (lento para restaurar), snapshot de volume da OCI (fica dentro da OCI).

## R13. Entrega: registro, assinatura, deploy, promoção e rollback

- **Decisão**:
  - Imagens `linux/arm64` no **GHCR** (públicas), marcadas com `sha-<commit>` e endereçadas por digest; **SBOM** CycloneDX com Syft; varredura com **Trivy**; **cosign** com assinatura *keyless* (OIDC do GitHub Actions). Os hosts só sobem imagens com assinatura válida emitida pelo workflow da `main` (REQ-FND-021).
  - *Release manifest* (`release.json`) por versão: lista de serviços e digests, versão, commit, data, SBOM.
  - Deploy por pull: o job do GitHub Actions entra no host por `cloudflared access ssh` (token de serviço do Access guardado no *environment*) e executa `/opt/koovela/bin/koovela-deploy <manifest>`, que verifica as assinaturas, faz `docker compose pull` por digest, `up -d` por processo, espera *readiness* e, se falhar, volta ao manifest anterior e alerta (REQ-FND-026). Um deploy por ambiente de cada vez (`concurrency` do Actions + trava em arquivo no host).
  - Staging recebe deploy automático a cada merge; produção pelo workflow `promote` (environment `production` com aprovação registrada), que reutiliza o mesmo manifest validado em staging (sem novo build).
  - Rollback: `koovela-deploy --rollback` (ou workflow `rollback`), um comando, volta ao manifest anterior guardado no host (meta 10 minutos).
  - Migrações seguem expandir → migrar → contrair, então a versão anterior continua compatível.
- **Por quê**: D22, REQ-FND-020 a 026, sem orquestrador.
- **Alternativas**: Watchtower (sem aprovação nem rollback controlado), Kamal (bom, mas exige SSH direto aberto e acrescenta ferramenta).

## R14. Segredos

- **Decisão**: `.env.example` completo e versionado; script `tools/env-check` falha no CI se o código ler chave ausente dele (varredura de `getConfig('…')`/Zod do schema de configuração). Em staging e produção, segredos no **OCI Vault** (camada gratuita) lidos no deploy por *instance principal* e entregues como *Docker secrets* (arquivos em `tmpfs`); nunca em variável logada. GitHub *environment secrets* só para o token do Access e o de assinatura do Play. Rotação documentada em `docs/ops/runbooks/rotacao-de-segredos.md`, com registro em `docs/ops/secret-rotations/` (sem valores). gitleaks em pre-commit e no CI, mais varredura do histórico inteiro antes de o repositório ficar público.
- **Alternativas**: SOPS + age (bom, mas segredo cifrado em repositório público aumenta a superfície), Doppler/Infisical Cloud (contas externas).

## R15. Web (painel, back-office, web do consumidor)

- **Decisão**: React 19 + Vite 7 + **React Router 7** em todas as webs: modo SPA para `painel` e `admin`; modo *framework* com SSR/pré-renderização para `consumer-web` (páginas públicas `koovela.com/{slug}` e LCP < 2,5 s em 4G, REQ-FND-093). TanStack Query com o SDK gerado. i18n com **i18next** (`pt-BR`). Acessibilidade: **@axe-core/playwright** nos shells (nível AA) no CI. Componentes base em `packages/ui-web` sobre Radix Primitives.
- **Alternativas**: Next.js (servidor Node extra e acoplamento à Vercel), TanStack Start (ainda jovem).

## R16. Apps nativos

- **Decisão**: React Native com **Expo SDK** (CNG/`expo prebuild`), builds **locais no GitHub Actions** (sem EAS pago): Android assinado com a chave de upload guardada no *environment* e enviado ao **teste interno do Google Play** (`fastlane supply`); iOS compilado para simulador em `macos-latest`. Links universais: `assetlinks.json` (com o fingerprint SHA-256 da chave de assinatura do Play) e `apple-app-site-association` (validado só no formato) servidos pelo `consumer-web` em `koovela.com/.well-known/`. Tokens e i18n compartilhados (`packages/design-tokens`, `packages/i18n`).
- **Alternativas**: EAS Build (cota gratuita pequena e fila lenta), React Native "puro" sem Expo (mais manutenção nativa).

## R17. Design tokens

- **Decisão**: **Style Dictionary 4** em `packages/design-tokens`, fonte em JSON (formato DTCG), gerando variáveis CSS (web) e um módulo TypeScript (React Native). Regra de lint própria (`eslint-plugin-koovela/no-raw-design-values`) proíbe hex, `rgb()`, `font-family` e `fontFamily` literais fora do pacote de tokens. Valores extraídos do Figma (página "01 · Fundamentos e Componentes", seção "Paleta e tipografia (PEN-01 · proposta)"): ver [data-model.md](./data-model.md#design-tokens).
- **Alternativas**: Tailwind (exigiria espelhar tokens), tokens só em CSS (não servem ao React Native).

## R18. Navegação dos shells (extraída do Figma em 2026-11-25)

Fonte: protótipo "Koovela — Protótipo v1.0", seção "Navegação" e páginas 02 a 07. Registrado como contrato de UI em [contracts/shell-navigation.json](./contracts/shell-navigation.json).

| Shell | Itens (destino · código de tela) |
|---|---|
| App do consumidor (`com.koovela.app`) | Agenda · C03 · Séries · C14 · Fidelidade · C15 · Perfil · C18. A aba **Início** (C00, vitrine) existe no componente, mas é da fase 2 e fica atrás de flag |
| App do colaborador (`com.koovela.pro`) | Agenda · K01 · Comissões · K03 · Folgas · K04 · Perfil · K05 |
| Colaborador desktop (`painel.koovela.com/pro`) | Agenda · KD1 · Comissões · KD3 · Folgas e trocas · KD4 · Perfil e portfólio · KD5 |
| Web do consumidor (`app.koovela.com`) | Barra superior; Meus agendamentos · W06 · Séries · W16 · Fidelidade · W17 · Perfil · W20. Página pública do slug: W07 (chegada por link ou QR: W04) |
| Painel do cliente (`painel.koovela.com`) | Início · P01 (rede: P02) · Agenda · P03 · Clientes · P11 · Catálogo · P12 · Equipe · P15 · Fidelidade · P20 · Horário ocioso · P08 · Avaliações · P24 · Financeiro · P21 · Notas fiscais · P23 · Configurações · P26; seletor de filial no topo; onboarding O01 a O05 fora do menu |
| Back-office (`admin.koovela.com`) | Visão geral · G01 · Tenants · G02 · Schemas · G03 · Onboarding e KYC · G04 · Impersonation · G05 · Concessões · G06 · Cobrança · G07 · Antifraude · G08 · Feature flags · G09 · Auditoria · G10 · Painéis de BI · B01 (abre `bi.koovela.com`) |

Os rótulos dos grupos do menu lateral aparecem no Figma só como "grupo"; serão conferidos com `get_design_context` na implementação.

---

## Itens que este plano devolve ao Documento Fundamental

- **D44**: Compose em cada host, sem orquestrador; domínios agrupados em `gateway`, `core` e `workers` (já proposto na spec).
- **D45 (nova)**: repositório de código público; specs e documentos de negócio locais; imagens públicas e assinadas.
- Emenda à constituição: CONST 4.2 (specs e `docs/fundamental/` fora do repositório) e verificação do Princípio VI (lint de spec local).
