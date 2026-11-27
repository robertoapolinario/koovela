/** Slug canônico (CONST 3): minúsculas, sem acento, só [a-z0-9-]. */
export function normalizeSlug(raw: string): string {
  return decodeURIComponent(raw)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Até a spec 005 (negócios e slugs), só existem slugs sintéticos de teste.
 * A fonte passa a ser o catálogo de slugs publicado pela 005.
 */
export const SYNTHETIC_SLUGS: ReadonlyMap<string, readonly string[]> = new Map([
  ['exemplo-sintetico', ['centro']],
  ['salao-agata', ['centro', 'jardins']],
]);

/** Caminhos do shell e técnicos: nunca podem virar slug de negócio (a 005 valida no cadastro). */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'appointments', 'series', 'loyalty', 'profile', 'assets', 'healthz', 'well-known', 'api', 'app', 'admin', 'painel',
  'bi', 'cdn', 'status', 'parceiros', 'seguranca', 'privacidade', 'suporte', 'termos', 'login', 'entrar',
]);
