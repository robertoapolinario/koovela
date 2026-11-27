import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Links universais (REQ-FND-090): assetlinks.json (Android) e apple-app-site-association (iOS) para
 * koovela.com/{slug} e app.koovela.com/*. Os identificadores são públicos e vêm do ambiente do build:
 *   ANDROID_CERT_SHA256 — fingerprint(s) SHA-256 da chave de assinatura do Play (separados por vírgula)
 *   APPLE_TEAM_ID       — Team ID da conta Apple Developer (pendente: docs/ops/runbooks/apple-pendente.md)
 * Em produção, a ausência do fingerprint do Play falha o build.
 */
export const PACKAGE = 'com.koovela.app';
const FP = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function assetlinks(fingerprints: readonly string[]) {
  const bad = fingerprints.filter((f) => !FP.test(f));
  if (bad.length) throw new Error(`fingerprint SHA-256 inválido: ${bad.join(', ')}`);
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: PACKAGE, sha256_cert_fingerprints: fingerprints },
    },
  ];
}

export function aasa(teamId: string | undefined) {
  const appIDs = teamId ? [`${teamId}.${PACKAGE}`] : [];
  return {
    applinks: {
      details: appIDs.length
        ? [
            {
              appIDs,
              components: [
                { '/': '/', exclude: true, comment: 'institucional fica na web' },
                { '/': '/.well-known/*', exclude: true },
                { '/': '/*', comment: 'koovela.com/{slug} e app.koovela.com/*' },
              ],
            },
          ]
        : [],
    },
    webcredentials: { apps: appIDs },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fps = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (fps.length === 0 && process.env.KOOVELA_ENV === 'production') {
    console.error('ANDROID_CERT_SHA256 ausente: o build de produção precisa do fingerprint da chave do Play');
    process.exit(1);
  }
  const dir = new URL('../public/.well-known/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('assetlinks.json', dir), `${JSON.stringify(assetlinks(fps), null, 2)}\n`);
  writeFileSync(new URL('apple-app-site-association', dir), `${JSON.stringify(aasa(process.env.APPLE_TEAM_ID), null, 2)}\n`);
}
