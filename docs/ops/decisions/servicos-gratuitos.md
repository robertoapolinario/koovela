# Serviços de terceiros e planos gratuitos (REQ-FND-048 — custo R$ 0 fora das VMs da OCI)

Revisado em 2026-11-27. Cada serviço tem métrica de uso e aviso em 80% (`koovela_free_tier_usage_ratio`,
alerta `FreeTierUsageHigh`, painel **Planos gratuitos** no Grafana).

| Serviço | Uso | Plano | Limite que importa | Como o uso é medido | Estado da métrica |
|---|---|---|---|---|---|
| OCI (Always Free) | VMs ARM, Vault, Object Storage | Always Free | 4 OCPU e 24 GB por conta; 200 GB de bloco; 20 GB de Object Storage | node-exporter (disco) e `DiskAbove80` | ✅ disco; ⏳ cota de Object Storage via `restic stats` na OCI |
| Cloudflare | DNS, proxy/TLS, WAF gerenciado, 1 regra de rate limit, Tunnel, Email Routing | Free | 1 regra de rate limit (já usada em `api.`) | configuração (OpenTofu) | n/a (limite estrutural) |
| Cloudflare Access | admin, bi, grafana, SSH | Zero Trust Free | 50 usuários | `koovela_free_tier_usage_ratio{service="access"}` | ⏳ exportador a criar (API de usuários do Zero Trust) |
| Cloudflare R2 | cópia externa do backup | Free | 10 GB armazenados | `infra/host/backup/metrics.sh` → `{service="r2"}` | ✅ |
| GitHub | repositório público, Actions (runner ARM), GHCR, Pages, Releases | Free (repositório público) | runners ARM públicos; GHCR público sem custo | — | n/a |
| Sentry | erros | Developer (grátis) | 5 mil erros/mês | `{service="sentry"}` via API de *stats* | ⏳ exportador a criar |
| Resend | e-mail transacional e alertas | Free | 100 e-mails/dia, 3 mil/mês | `{service="resend"}` | ⏳ exportador a criar; **decisão de custo antes de escalar** (memória do projeto) |
| ntfy.sh | push dos alertas críticos | Free | limite por tópico/dia | `{service="ntfy"}` | ⏳ |
| Upptime (GitHub Actions + Pages) | `status.koovela.com` | grátis | minutos de Actions do repositório público | — | n/a |
| Let's Encrypt / Cloudflare | certificados | grátis | — | `koovela_edge_cert_expiry_days` | ✅ |
| Google Play | teste interno dos apps | taxa única de US$ 25 | — | — | ⚠️ custo único fora das VMs: **requer decisão** |
| Apple Developer | iOS | US$ 99/ano | — | — | ⏳ pendente (ver `runbooks/apple-pendente.md`) |

## Pendências

- Exportadores de uso para Access, Sentry, Resend e ntfy: um job agendado no host de dados que consulta cada API
  e escreve `koovela_free_tier_usage_ratio{service=…}` no textfile do node-exporter. Sem eles, o alerta de 80%
  só cobre R2 e disco.
- Google Play (US$ 25) e Apple (US$ 99/ano) são exceções de custo que precisam de decisão explícita (CONST, REQ-FND-048).
