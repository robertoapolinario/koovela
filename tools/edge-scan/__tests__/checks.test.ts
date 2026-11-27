import { describe, expect, it } from 'vitest';
import { checkNoindex, checkSecurityHeaders } from '../src/checks/headers.ts';
import { checkAccessRequired, checkHttpsOnly, checkOriginClosed, checkWwwRedirect } from '../src/checks/http.ts';
import { checkMailDomain, parseSecurityTxt } from '../src/checks/email-security.ts';
import type { Fetch } from '../src/checks/types.ts';

const GOOD = new Headers({
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'content-security-policy': "default-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
});
const fake = (status: number, headers: Record<string, string> = {}): Fetch => async () => new Response(null, { status, headers });

describe('cabeçalhos de segurança', () => {
  it('aceita o conjunto completo', () => {
    expect(checkSecurityHeaders('t', GOOD, 'web').every((r) => r.ok)).toBe(true);
  });
  it.each([
    ['strict-transport-security', 'max-age=300', 'hsts'],
    ['content-security-policy', "default-src *; script-src 'unsafe-inline'", 'csp'],
    ['x-frame-options', 'SAMEORIGIN', 'x-frame-options'],
    ['x-content-type-options', '', 'nosniff'],
    ['referrer-policy', 'unsafe-url', 'referrer-policy'],
    ['permissions-policy', '', 'permissions-policy'],
  ])('falha com %s fraco', (name, value, check) => {
    const h = new Headers(GOOD);
    if (value) h.set(name, value);
    else h.delete(name);
    expect(checkSecurityHeaders('t', h, 'web').find((r) => r.check === check)?.ok).toBe(false);
  });
  it("API exige default-src 'none'", () => {
    expect(checkSecurityHeaders('t', GOOD, 'api').find((r) => r.check === 'csp')?.ok).toBe(false);
  });
  it('noindex', () => {
    expect(checkNoindex('t', new Headers({ 'x-robots-tag': 'noindex, nofollow' })).ok).toBe(true);
    expect(checkNoindex('t', new Headers()).ok).toBe(false);
  });
});

describe('redirecionamentos e acesso', () => {
  it('www → apex 301 preservando caminho e query', async () => {
    const ok = await checkWwwRedirect(fake(301, { location: 'https://koovela.com/caminho/teste?x=1&y=2' }), 'https://www.koovela.com', 'https://koovela.com');
    expect(ok.ok).toBe(true);
    const bad = await checkWwwRedirect(fake(302, { location: 'https://koovela.com/' }), 'https://www.koovela.com', 'https://koovela.com');
    expect(bad.ok).toBe(false);
  });
  it('HTTP redireciona para HTTPS', async () => {
    expect((await checkHttpsOnly(fake(301, { location: 'https://x' }), 'http://x')).ok).toBe(true);
    expect((await checkHttpsOnly(fake(200), 'http://x')).ok).toBe(false);
  });
  it('admin exige Access', async () => {
    expect((await checkAccessRequired(fake(302, { location: 'https://koovela.cloudflareaccess.com/cdn-cgi/access/login/admin' }), 'u')).ok).toBe(true);
    expect((await checkAccessRequired(fake(200), 'u')).ok).toBe(false);
  });
  it('origem fechada', async () => {
    expect((await checkOriginClosed(async () => { throw new Error('ECONNREFUSED'); }, 'http://10.0.0.1')).ok).toBe(true);
    expect((await checkOriginClosed(fake(200), 'http://10.0.0.1')).ok).toBe(false);
  });
});

describe('e-mail e security.txt', () => {
  const dns: Record<string, string[][]> = {
    'mail.koovela.com': [['v=spf1 include:amazonses.com ~all']],
    'resend._domainkey.mail.koovela.com': [['p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ']],
    '_dmarc.mail.koovela.com': [['v=DMARC1; p=quarantine; rua=mailto:dmarc@koovela.com']],
  };
  const resolver = async (n: string) => dns[n] ?? [];
  it('SPF, DKIM e DMARC quarantine', async () => {
    expect((await checkMailDomain('mail.koovela.com', resolver)).every((r) => r.ok)).toBe(true);
  });
  it('DMARC p=none falha', async () => {
    const r2 = async (n: string) => (n.startsWith('_dmarc') ? [['v=DMARC1; p=none']] : (dns[n] ?? []));
    expect((await checkMailDomain('mail.koovela.com', r2)).find((r) => r.check === 'dmarc')?.ok).toBe(false);
  });
  it('security.txt: contato e expiração', () => {
    const now = new Date('2026-11-27T00:00:00Z');
    expect(parseSecurityTxt('Contact: mailto:seguranca@koovela.com\nExpires: 2027-06-01T00:00:00Z\n', now)).toMatchObject({ ok: true, days: 186 });
    expect(parseSecurityTxt('Contact: mailto:x@y.com\nExpires: 2027-06-01T00:00:00Z', now).ok).toBe(false);
    expect(parseSecurityTxt('Contact: mailto:seguranca@koovela.com\nExpires: 2026-01-01T00:00:00Z', now).ok).toBe(false);
  });
});
