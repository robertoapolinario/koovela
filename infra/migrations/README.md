# migrations

Executor único de migrações (Kysely). Cada domínio tem as suas em `services/<domínio>/migrations/NNNN_nome.ts`
e o próprio schema `koovela_<domínio>` com credencial própria (REQ-FND-028). Migrações seguem
expandir → migrar → contrair e têm `down`.

```sh
pnpm --filter @koovela/migrations migrate        # up
pnpm --filter @koovela/migrations migrate down   # desfaz a última
```
