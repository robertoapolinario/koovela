# Rotação de segredos (REQ-FND-083)

**Quando**: na saída de qualquer pessoa com acesso (no mesmo dia), em suspeita de vazamento (imediato) e a cada
6 meses (agendada). Todo segredo mora no **OCI Vault** do ambiente; os hosts o leem por *instance principal*
e o entregam aos contêineres como Docker secret em `tmpfs` (`/etc/koovela/secrets`, só em memória).

## Passo a passo

1. **Registre** a rotação: copie `docs/ops/secret-rotations/_modelo.md` para `AAAA-MM-DD-<motivo>.md`
   (só nomes de segredo, nunca valores).
2. **Gere o valor novo** fora do repositório (`openssl rand -base64 32`), sem colar em chat, issue ou log.
3. **Atualize no destino primeiro**, quando houver um:
   - MySQL: `ALTER USER 'koovela_<domínio>'@'%' IDENTIFIED BY '<novo>'` (pelo túnel, no host de dados);
   - RabbitMQ: `rabbitmqctl change_password koovela '<novo>'`;
   - Redis: `CONFIG SET requirepass` + atualizar `redis_password`;
   - provedores externos (Sentry, Resend, R2, Cloudflare): gere a chave nova no painel e **revogue** a antiga
     só depois do passo 5.
4. **Crie a nova versão** do segredo no OCI Vault (console ou `oci vault secret update-base64`).
5. **Propague**: em cada host, `sudo systemctl start koovela-secrets.service`. O script só imprime os **nomes**
   que mudaram e recria os contêineres afetados. Confira `/v1/health` e os logs.
6. **Revogue** o valor antigo no provedor e marque as versões antigas do Vault como `DEPRECATED`.
7. **Offboarding**: remova a pessoa da organização do GitHub (o Access usa a organização), do Cloudflare,
   da OCI, do Sentry e do Resend; rode `pnpm secrets:scan --history` por garantia.
8. Abra PR com o registro em `docs/ops/secret-rotations/`.

## Segredos por ambiente

| Nome | Usado por | Destino primeiro |
|---|---|---|
| `mysql_root_password`, `mysql_password_<domínio>` | MySQL / processos | MySQL |
| `rabbitmq_password`, `rabbitmq_url` | RabbitMQ / processos | RabbitMQ |
| `redis_password`, `redis_url` | Redis / processos | Redis |
| `tunnel_token` (app e db) | `koovela-tunnel.service` | Cloudflare Zero Trust |
| `restic_password` | backup | **não troque sem re-cifrar o repositório** (`restic key add` / `key remove`) |
| `r2_*`, `oci_s3_*` | backup | Cloudflare R2 / OCI |
| `smtp_password`, `ntfy_token`, `alertmanager_webhook_token`, `grafana_admin_password`, `sentry_dsn` | observabilidade | provedor |
