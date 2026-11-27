# Data Model: Fundação da plataforma Koovela (001)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Esta spec **não cria entidades de negócio** nem tabelas de tenant. Ela define registros operacionais, o conjunto de design tokens e a configuração. Nenhum registro abaixo contém dado pessoal além do identificador do executor (login do GitHub), tratado como dado operacional de segurança.

---

## 1. Registros operacionais

| Registro | Onde vive | Fonte da verdade |
|---|---|---|
| Versão de release | GitHub Releases + GHCR (anexo `release.json`) | Pipeline da `main` |
| Registro de deploy | GitHub Deployments (por *environment*) + `/var/lib/koovela/deploys.jsonl` no host | Workflow de deploy + `koovela-deploy` |
| Registro de backup | Métricas no Prometheus + *snapshots* restic (com tags) | Job de backup |
| Teste de restauração | `docs/ops/restore-tests/AAAA-MM.md` (repositório) | Job mensal no staging + revisão do SRE |
| Rotação de segredo | `docs/ops/secret-rotations/AAAA-MM-DD-<motivo>.md` (sem valores) | Runbook |
| Alerta | Alertmanager (estado) + `platform.alert.*` nos logs | Regras em `infra/observability/alerts/*.yml` |

Os eventos `platform.*` da spec são emitidos como **registros estruturados** (campo `event_type`) no Loki e, quando cabe, como status de deployment do GitHub. Nesta spec eles **não** trafegam no RabbitMQ; o esquema de cada um está em [contracts/platform-events.asyncapi.yaml](./contracts/platform-events.asyncapi.yaml) para que o canal possa mudar sem mudar o formato.

### 1.1 Versão de release (`release.json`)

| Campo | Tipo | Regra |
|---|---|---|
| `version` | string | `AAAA.MM.DD-<sha7>`, imutável |
| `commit` | string | SHA completo do commit da `main` |
| `built_at` | string ISO-8601 (UTC) | — |
| `images` | lista de `{ service, image, digest }` | `digest` obrigatório (`sha256:…`), plataforma `linux/arm64` |
| `sbom` | URL do anexo CycloneDX | Obrigatório (REQ-FND-014) |
| `signature` | identidade cosign esperada | Workflow `deliver.yml` da `main` |

**Estados** (Regras e estados da spec):

```
construída → publicada → em_staging → aprovada → em_produção → substituída
                                                   └────────→ revertida
```

Uma versão só passa para `aprovada` se estiver `em_staging` com saúde verde.

### 1.2 Registro de deploy

| Campo | Tipo | Regra |
|---|---|---|
| `deploy_id` | UUIDv7 | — |
| `environment` | `staging` \| `production` | — |
| `version` | string | Deve existir em Releases |
| `previous_version` | string \| null | Usado pelo rollback |
| `kind` | `deploy` \| `promotion` \| `rollback` | — |
| `approved_by` | login do GitHub \| null | Obrigatório quando `environment = production` e `kind ≠ rollback` |
| `started_at`, `finished_at` | ISO-8601 UTC | — |
| `status` | `started` → `verifying_health` → `succeeded` \| `failed` | `failed` mantém `previous_version` no ar |

Invariante: no máximo **um** deploy com `status ∈ {started, verifying_health}` por ambiente.

### 1.3 Registro de backup

| Campo | Tipo | Regra |
|---|---|---|
| `backup_id` | id do *snapshot* restic | — |
| `kind` | `daily` \| `binlog` \| `monthly` | — |
| `started_at`, `finished_at` | ISO-8601 UTC | — |
| `size_bytes` | inteiro | — |
| `destinations` | lista `oci-object-storage` \| `cloudflare-r2` \| `own-equipment` | Pelo menos um fora da OCI |
| `status` | `scheduled` → `running` → `completed` \| `failed` | `completed` exige a cópia externa concluída |

Retenção: 35 `daily` + 12 `monthly`; `binlog` cobre os 35 dias.

### 1.4 Teste de restauração (`docs/ops/restore-tests/AAAA-MM.md`)

Cabeçalho YAML obrigatório: `date`, `environment` (sempre `staging`), `restored_point` (ISO-8601), `source` (`cloudflare-r2` ou equipamento próprio), `duration_minutes`, `executor`, `checks` (lista de verificações com resultado), `result` (`success` \| `failure`). Alerta quando o mais recente tiver mais de 35 dias.

### 1.5 Rotação de segredo

Cabeçalho: `date`, `reason` (`offboarding` \| `suspected_leak` \| `scheduled`), `secrets` (nomes, nunca valores), `environments`, `executor`.

### 1.6 Alerta

Definido em código (`infra/observability/alerts/*.yml`): `name`, `severity` (`critical` \| `warning`), `environment`, `expr`, `for`, `runbook` (caminho em `docs/ops/runbooks/`). Roteamento:

| Severidade | Ambiente | Canal | Horário | Reenvio |
|---|---|---|---|---|
| `critical` | produção | push (ntfy) + e-mail | 24x7 | a cada 15 min até silenciar |
| `warning` | produção | e-mail | seg. a sex., 9h às 18h | resumo diário |
| qualquer | staging | e-mail | seg. a sex., 9h às 18h | resumo diário |

Alertas críticos (REQ-FND-045): produção sem saúde, taxa de erro acima do limite, falha de backup, disco acima de 80%, falha de deploy.

---

## 2. Configuração

Um único esquema Zod em `packages/platform/config` descreve todas as chaves; `.env.example` é gerado a partir dele e conferido no CI (REQ-FND-080).

| Grupo | Exemplos de chave | Origem em staging e produção |
|---|---|---|
| Processo | `KOOVELA_ENV`, `KOOVELA_PROCESS`, `KOOVELA_DOMAINS`, `LOG_LEVEL` | Compose (não secreto) |
| Banco | `MYSQL_HOST`, `MYSQL_USER_<DOMÍNIO>`, `MYSQL_PASSWORD_<DOMÍNIO>` | OCI Vault → Docker secret |
| Fila e cache | `RABBITMQ_URL`, `REDIS_URL` | OCI Vault → Docker secret |
| Observabilidade | `OTEL_EXPORTER_OTLP_ENDPOINT`, `SENTRY_DSN` | Compose / OCI Vault |
| Borda | `CORS_ALLOWED_ORIGINS` | Compose, por ambiente |

Regras: nenhuma chave lida fora do esquema; o esquema marca chaves `secret: true`, que o logger nunca imprime.

---

## 3. Design tokens

Fonte: Figma, página "01 · Fundamentos e Componentes", seção "Paleta e tipografia (PEN-01 · proposta)". Formato DTCG em `packages/design-tokens/src/*.json`. `PEN-01` continua ASSUMIDO: trocar um valor não muda nomes.

### 3.1 Cor

| Token | Valor |
|---|---|
| `color.brand.terracota` | `#B5532F` |
| `color.brand.terracota.700` | `#93421F` |
| `color.brand.terracota.100` | `#F6E3D9` |
| `color.brand.terracota.50` | `#FBF1EB` |
| `color.brand.oliveira` | `#3F4A2E` |
| `color.brand.oliveira.700` | `#5A6646` |
| `color.brand.oliveira.100` | `#E6E9DD` |
| `color.brand.creme` | `#F7EEDC` |
| `color.brand.creme.50` | `#FBF7EE` |
| `color.neutral.0` | `#FFFFFF` |
| `color.neutral.50` | `#FAF7F2` |
| `color.neutral.100` | `#F2EDE4` |
| `color.neutral.200` | `#E5DED2` |
| `color.neutral.300` | `#CFC6B7` |
| `color.neutral.500` | `#8C8476` |
| `color.neutral.700` | `#4F4A41` |
| `color.neutral.900` | `#22201B` |
| `color.feedback.success` / `.success.bg` | `#2F7A4B` / `#E3F1E7` |
| `color.feedback.warning` / `.warning.bg` | `#9A6412` / `#FBF0D9` |
| `color.feedback.error` / `.error.bg` | `#A8201A` / `#F9E1DE` |
| `color.feedback.info` / `.info.bg` | `#2C6A8A` / `#E1EEF5` |

Estados de componente (REQ-FND-060): `state.hover`, `state.focus` (anel de foco), `state.disabled`, `state.loading` são **tokens semânticos** derivados dos acima; os valores exatos vêm dos componentes do Figma (Botão, Campo, Chip) e são conferidos com `get_design_context` na implementação. Todo par texto/fundo usado DEVE ter contraste AA (verificado por teste dos tokens).

### 3.2 Tipografia (DM Sans)

| Token | Tamanho |
|---|---|
| `font.display` | 44 px |
| `font.title.1` | 32 px |
| `font.title.2` | 24 px |
| `font.title.3` | 18 px |
| `font.body` / `font.body.strong` | 15 px |
| `font.small` | 13 px |
| `font.caption` | 12 px |
| `font.button` | 15 px |
| `font.number` | 28 px |

Pesos e alturas de linha vêm dos estilos de texto do Figma, conferidos na implementação.

---

## 4. Navegação dos shells

Contrato de UI em [contracts/shell-navigation.json](./contracts/shell-navigation.json) (lista de destinos e código de tela de cada shell). Cada destino renderiza uma tela vazia que mostra o código (REQ-FND-063).
