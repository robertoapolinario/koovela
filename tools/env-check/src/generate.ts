import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderEnvExample } from '@koovela/platform-config';

/** Gera o `.env.example` a partir do esquema único (REQ-FND-080). */
const target = fileURLToPath(new URL('../../../.env.example', import.meta.url));
writeFileSync(target, renderEnvExample());
console.log('.env.example atualizado');
