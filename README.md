# Koovela

Monorepo da plataforma Koovela (pnpm + Turborepo, TypeScript sobre Node.js 24).

## Ambiente local

Pré-requisitos (macOS Intel ou Apple Silicon, Linux):

- Docker com Compose v2: [Colima](https://github.com/abiosoft/colima) (`colima start --cpu 4 --memory 8`) ou Docker Desktop, com pelo menos **8 GB de RAM** para o Docker;
- **20 GB** livres em disco;
- Node.js 24 (veja `.nvmrc`) e pnpm 10 (`corepack enable`). Sem Node no host, use `tools/dev/kn` na frente de cada comando (ex.: `tools/dev/kn pnpm koovela up`), que roda tudo num contêiner.

Comando único:

```sh
pnpm install
pnpm koovela up
```

O `up` confere os pré-requisitos e gera o `.env` a partir do `.env.example`, preenchendo os segredos com valores só de desenvolvimento. Em seguida sobe banco, fila, cache e proxy, roda as migrações e a semente sintética e espera a saúde de todos os componentes. Se algo falhar, a mensagem nomeia o componente.

| Endereço | O que é |
|---|---|
| http://koovela.localhost | páginas públicas |
| http://app.koovela.localhost | web do consumidor |
| http://painel.koovela.localhost | painel do cliente (`/pro` para o colaborador) |
| http://admin.koovela.localhost | back-office |
| http://api.koovela.localhost/v1/health | saúde do gateway |

Outros comandos: `pnpm koovela down`, `pnpm koovela reset` (apaga os dados locais e recria), `pnpm koovela doctor`.

Os dados locais são **sempre sintéticos**, gerados com semente fixa e marcados como sintéticos.

## Qualidade

```sh
pnpm lint && pnpm typecheck && pnpm test   # unidade
pnpm test:integration                     # integração com contêineres reais (Testcontainers)
pnpm arch:check                           # fronteiras entre domínios
pnpm env:check                            # chaves usadas × .env.example
```
