import { describe, expect, it } from 'vitest';
import { PACKAGE, aasa, assetlinks } from '../scripts/well-known.ts';

const FP = 'AB:'.repeat(31) + 'CD';

describe('assetlinks.json (Android, REQ-FND-090)', () => {
  it('associa com.koovela.app com o fingerprint SHA-256 da chave do Play', () => {
    const [stmt] = assetlinks([FP]);
    expect(stmt?.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(stmt?.target).toEqual({ namespace: 'android_app', package_name: PACKAGE, sha256_cert_fingerprints: [FP] });
  });
  it('recusa fingerprint fora do formato', () => {
    expect(() => assetlinks(['ab:cd'])).toThrow(/inválido/);
  });
});

describe('apple-app-site-association (iOS)', () => {
  it('cobre /{slug} e app.koovela.com/*, sem a raiz institucional nem /.well-known', () => {
    const doc = aasa('ABCDE12345');
    const d = doc.applinks.details[0];
    expect(d?.appIDs).toEqual(['ABCDE12345.com.koovela.app']);
    const comps = d?.components ?? [];
    expect(comps.find((c) => c['/'] === '/*' && !('exclude' in c))).toBeTruthy();
    expect(comps.filter((c) => 'exclude' in c).map((c) => c['/'])).toEqual(['/', '/.well-known/*']);
  });
  it('sem Team ID (conta Apple pendente) publica o arquivo sem apps', () => {
    expect(aasa(undefined).applinks.details).toEqual([]);
  });
});
