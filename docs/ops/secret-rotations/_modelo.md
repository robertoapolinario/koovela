---
date: AAAA-MM-DD
reason: offboarding        # offboarding | suspected_leak | scheduled
secrets:                   # SÓ NOMES, nunca valores
  - mysql_password_platform
environments: [staging, production]
executor: login-do-github
---

# Rotação de segredos — AAAA-MM-DD

- **Motivo**: …
- **O que foi trocado** (nomes): …
- **Verificação**: `/v1/health` ok em cada ambiente depois da troca; logs sem erro de autenticação.
- **Acessos revogados** (se offboarding): GitHub, Cloudflare Access, OCI, Sentry, Resend.
