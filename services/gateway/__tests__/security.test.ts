import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { assertCorsOrigins, canonicalOrigins, isCookieAllowed, securityPlugin, sessionCookie, setSessionCookie } from '../src/plugins/security.ts';

describe('cookies de sessão (REQ-FND-036)', () => {
  it('produção: __Host-, Secure, HttpOnly, SameSite=Lax e sem Domain', () => {
    const c = sessionCookie('sid', 'abc', 'production');
    expect(c).toBe('__Host-sid=abc; Path=/; HttpOnly; SameSite=Lax; Secure');
    expect(isCookieAllowed(c, 'production')).toBe(true);
  });
  it('recusa Domain=.koovela.com e cookie sem Secure em produção', () => {
    expect(isCookieAllowed('sid=1; Domain=.koovela.com; Path=/; HttpOnly; SameSite=Lax; Secure', 'production')).toBe(false);
    expect(isCookieAllowed('sid=1; Path=/; HttpOnly; SameSite=Lax', 'production')).toBe(false);
    expect(isCookieAllowed('sid=1; Path=/; HttpOnly; SameSite=Lax', 'local')).toBe(true);
  });
  it('o hook remove o cookie fora da política', async () => {
    const app = Fastify();
    securityPlugin(app, 'production');
    app.get('/bad', async (_q, r) => r.header('set-cookie', 'sid=1; Domain=.koovela.com; HttpOnly; SameSite=Lax; Secure').send('x'));
    app.get('/good', async (_q, r) => (setSessionCookie(r, 'sid', '1', 'production'), r.send('x')));
    expect((await app.inject('/bad')).headers['set-cookie']).toBeUndefined();
    expect((await app.inject('/good')).headers['set-cookie']).toContain('__Host-sid=1');
  });
});

describe('CORS por ambiente', () => {
  it('origens canônicas', () => {
    expect(canonicalOrigins('production')).toEqual([
      'https://koovela.com',
      'https://app.koovela.com',
      'https://painel.koovela.com',
      'https://admin.koovela.com',
    ]);
    expect(canonicalOrigins('staging')).toContain('https://app.staging.koovela.com');
  });
  it('recusa origem fora do conjunto do ambiente', () => {
    expect(() => assertCorsOrigins('production', ['https://app.koovela.com'])).not.toThrow();
    expect(() => assertCorsOrigins('production', ['https://app.staging.koovela.com'])).toThrow(/fora do conjunto/);
    expect(() => assertCorsOrigins('production', ['*'])).toThrow();
  });
});
