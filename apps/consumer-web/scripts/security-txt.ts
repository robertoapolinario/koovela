import { mkdirSync, writeFileSync } from 'node:fs';

/** security.txt (RFC 9116, REQ-FND-085) com Expires = build + 180 dias. Gerado a cada build. */
const expires = new Date(Date.now() + 180 * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const dir = new URL('../public/.well-known/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(
  new URL('security.txt', dir),
  [
    'Contact: mailto:seguranca@koovela.com',
    `Expires: ${expires}`,
    'Preferred-Languages: pt-BR, en',
    'Canonical: https://koovela.com/.well-known/security.txt',
    'Policy: https://koovela.com/seguranca',
    '',
  ].join('\n'),
);
