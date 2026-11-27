import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { keys, renderEnvExample } from '@koovela/platform-config';
import { exampleKeys, RUNTIME_ALLOWED, usedKeys } from './scan.ts';

/** Falha se o código usar chave ausente do `.env.example` ou se o arquivo estiver desatualizado (REQ-FND-080). */
const root = fileURLToPath(new URL('../../../', import.meta.url));
const example = readFileSync(`${root}.env.example`, 'utf8');
const inExample = exampleKeys(example);
const problems: string[] = [];

if (example !== renderEnvExample()) problems.push('.env.example desatualizado: rode `pnpm env:generate`');
for (const k of Object.keys(keys)) if (!inExample.has(k)) problems.push(`${k} está no esquema e falta no .env.example`);
// Código de aplicação (processos, pacotes, webs, apps e o executor de migrações); tools/ é ferramenta de dev/CI.
for (const [k, where] of usedKeys(root, ['services', 'runtimes', 'packages', 'apps', 'infra/migrations'])) {
  if (!inExample.has(k) && !RUNTIME_ALLOWED.has(k)) problems.push(`${k} usada em ${where.join(', ')} e ausente do .env.example`);
}
if (problems.length > 0) {
  console.error(problems.map((p) => `✖ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`✔ env:check — ${inExample.size} chaves`);
