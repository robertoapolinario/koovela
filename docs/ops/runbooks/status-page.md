# Página de status (REQ-FND-046)

`status.koovela.com` é servida pelo GitHub Pages a partir do repositório público separado **`koovela-status`**
([Upptime](https://upptime.js.org)), fora da OCI: continua no ar e alertando mesmo com a OCI inteira fora.

## Criar (uma vez)

1. Crie o repositório a partir do template `upptime/upptime` com o nome `koovela-status` (público).
2. Copie `infra/status/.upptimerc.yml` deste repositório para a raiz do novo.
3. Secrets do repositório: `GH_PAT` (token com `repo` e `workflow`, exigido pelo Upptime) e `NOTIFICATION_NTFY_URL`.
4. Settings → Pages: branch `gh-pages`; domínio `status.koovela.com`; HTTPS obrigatório.
5. Cloudflare: `CNAME status → robertoapolinario.github.io` **sem proxy** (o GitHub emite o certificado).
6. Confirme: o painel mostra as quatro superfícies e um teste de queda (URL inválida numa cópia) gera o push.

## Janela de manutenção

Abra uma issue no `koovela-status` com o label **`maintenance`** e, no corpo:

```
<!--
start: 2026-12-10T05:00:00-03:00
end: 2026-12-10T06:00:00-03:00
expectedDown: api, painel
-->
Atualização do banco de dados.
```

O Upptime mostra a janela na página e não abre incidente para as superfícies listadas durante o período.

## Incidente

O Upptime abre uma issue automaticamente quando uma superfície cai e fecha quando volta. Escreva atualizações
como comentários na issue (aparecem na página). Nada de dado pessoal nas issues: o repositório é público.
