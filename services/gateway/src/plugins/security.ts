import type { FastifyInstance, FastifyReply } from 'fastify';

/**
 * Cookies e CORS (REQ-FND-036, CONST 3).
 * - Cookie de sessão sempre host-only (sem `Domain`), `Secure`, `HttpOnly`, `SameSite=Lax`.
 * - Qualquer `Set-Cookie` com `Domain=.koovela.com` (ou sem `Secure`/`HttpOnly` fora do local) é barrado.
 * - O CORS aceita só as origens canônicas do ambiente.
 */
export type KoovelaEnv = 'local' | 'test' | 'staging' | 'production';

export function canonicalOrigins(env: KoovelaEnv): string[] {
  const surfaces = (apex: string, scheme: string) => [
    `${scheme}://${apex}`,
    ...['app', 'painel', 'admin'].map((s) => `${scheme}://${s}.${apex}`),
  ];
  switch (env) {
    case 'production':
      return surfaces('koovela.com', 'https');
    case 'staging':
      return ['https://staging.koovela.com', ...['app', 'painel', 'admin'].map((s) => `https://${s}.staging.koovela.com`)];
    default:
      return surfaces('koovela.localhost', 'http');
  }
}

/** Falha na subida se a configuração listar origem fora do conjunto canônico do ambiente. */
export function assertCorsOrigins(env: KoovelaEnv, configured: readonly string[]): void {
  const allowed = new Set(canonicalOrigins(env));
  const extra = configured.filter((o) => !allowed.has(o));
  if (extra.length > 0) throw new Error(`CORS_ALLOWED_ORIGINS fora do conjunto canônico de ${env}: ${extra.join(', ')}`);
}

export interface SessionCookieOptions {
  readonly maxAgeSeconds?: number;
  readonly path?: string;
}

export function sessionCookie(name: string, value: string, env: KoovelaEnv, o: SessionCookieOptions = {}): string {
  if (!/^(__Host-)?[A-Za-z0-9_-]+$/.test(name)) throw new Error('nome de cookie inválido');
  const secure = env === 'staging' || env === 'production';
  // __Host- garante no navegador: Secure, Path=/ e sem Domain.
  const finalName = secure && !name.startsWith('__Host-') ? `__Host-${name}` : name;
  const parts = [`${finalName}=${encodeURIComponent(value)}`, `Path=${o.path ?? '/'}`, 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  if (o.maxAgeSeconds !== undefined) parts.push(`Max-Age=${o.maxAgeSeconds}`);
  return parts.join('; ');
}

export function setSessionCookie(reply: FastifyReply, name: string, value: string, env: KoovelaEnv, o?: SessionCookieOptions): void {
  void reply.header('set-cookie', sessionCookie(name, value, env, o));
}

export function isCookieAllowed(cookie: string, env: KoovelaEnv): boolean {
  const attrs = cookie.split(';').map((p) => p.trim().toLowerCase());
  if (attrs.some((a) => a.startsWith('domain='))) return false;
  if (!attrs.includes('httponly') || !attrs.includes('samesite=lax')) return false;
  if ((env === 'staging' || env === 'production') && !attrs.includes('secure')) return false;
  return true;
}

export function securityPlugin(app: FastifyInstance, env: KoovelaEnv): void {
  app.addHook('onSend', async (req, reply, payload) => {
    const raw = reply.getHeader('set-cookie');
    const cookies = raw === undefined ? [] : Array.isArray(raw) ? raw.map(String) : [String(raw)];
    const bad = cookies.filter((c) => !isCookieAllowed(c, env));
    if (bad.length > 0) {
      req.log.error({ count: bad.length }, 'cookie fora da política (Domain/Secure/HttpOnly/SameSite) removido');
      const kept = cookies.filter((c) => isCookieAllowed(c, env));
      if (kept.length > 0) void reply.header('set-cookie', kept);
      else reply.removeHeader('set-cookie');
    }
    return payload;
  });
}
