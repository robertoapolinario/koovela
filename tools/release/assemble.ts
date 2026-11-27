import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

/**
 * Monta e valida o release.json (data-model §1.1) a partir dos digests de cada imagem.
 * Uso: node tools/release/assemble.ts <pasta-digests> <saida> (variáveis: VERSION, COMMIT, REPOSITORY, SERVER_URL)
 */
const [dir, out] = process.argv.slice(2);
const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`variável ${k} ausente`);
  return v;
};
if (!dir || !out) throw new Error('uso: assemble.ts <pasta-digests> <saida>');
const version = env('VERSION');
const repo = env('REPOSITORY').toLowerCase();
const server = env('SERVER_URL');
const images = readdirSync(dir)
  .filter((f) => f.endsWith('.digest'))
  .sort()
  .map((f) => ({
    service: f.replace(/\.digest$/, ''),
    image: `ghcr.io/${repo}/${f.replace(/\.digest$/, '')}`,
    digest: readFileSync(join(dir, f), 'utf8').trim(),
    platform: 'linux/arm64',
  }));
const release = {
  version,
  commit: env('COMMIT'),
  built_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  images,
  sbom: `${server}/${env('REPOSITORY')}/releases/download/${version}/sbom.cdx.zip`,
  signature: {
    issuer: 'https://token.actions.githubusercontent.com',
    identity: `${server}/${env('REPOSITORY')}/.github/workflows/deliver.yml@refs/heads/main`,
  },
};
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats.default(ajv);
const schema = JSON.parse(readFileSync(new URL('../../infra/host/koovela-deploy/release.schema.json', import.meta.url), 'utf8'));
const validate = ajv.compile(schema);
if (!validate(release)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
writeFileSync(out, `${JSON.stringify(release, null, 2)}\n`);
console.log(`✔ release.json ${version} (${images.length} imagens)`);
