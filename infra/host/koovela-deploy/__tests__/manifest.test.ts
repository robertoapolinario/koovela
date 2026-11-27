import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats.default(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(new URL('../release.schema.json', import.meta.url), 'utf8')));
const D = `sha256:${'a'.repeat(64)}`;

const good = {
  version: '2026.11.27-abc1234',
  commit: 'abc1234'.padEnd(40, '0'),
  built_at: '2026-11-27T12:00:00Z',
  images: [{ service: 'gateway', image: 'ghcr.io/koovela/koovela/gateway', digest: D, platform: 'linux/arm64' }],
  sbom: 'https://github.com/koovela/koovela/releases/download/2026.11.27-abc1234/sbom.cdx.json',
  signature: {
    issuer: 'https://token.actions.githubusercontent.com',
    identity: 'https://github.com/koovela/koovela/.github/workflows/deliver.yml@refs/heads/main',
  },
};
const ok = (m: unknown) => validate(m);

describe('release.json', () => {
  it('aceita o manifesto completo', () => {
    expect(ok(good), JSON.stringify(validate.errors)).toBe(true);
  });
  it('exige versão AAAA.MM.DD-sha7', () => {
    expect(ok({ ...good, version: '1.2.3' })).toBe(false);
  });
  it('exige digest em toda imagem', () => {
    const { digest: _d, ...noDigest } = good.images[0]!;
    expect(ok({ ...good, images: [noDigest] })).toBe(false);
    expect(ok({ ...good, images: [{ ...good.images[0], digest: 'latest' }] })).toBe(false);
  });
  it('exige plataforma linux/arm64', () => {
    expect(ok({ ...good, images: [{ ...good.images[0], platform: 'linux/amd64' }] })).toBe(false);
  });
  it('exige SBOM', () => {
    const { sbom: _s, ...noSbom } = good;
    expect(ok(noSbom)).toBe(false);
  });
  it('exige a identidade do deliver.yml da main', () => {
    expect(ok({ ...good, signature: { ...good.signature, identity: good.signature.identity.replace('main', 'feature') } })).toBe(false);
  });
});
