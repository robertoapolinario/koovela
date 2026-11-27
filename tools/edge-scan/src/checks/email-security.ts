import { resolveTxt } from 'node:dns/promises';
import { result, type CheckResult, type Fetch } from './types.ts';

/** SPF, DKIM e DMARC p=quarantine|reject nos domínios de envio; security.txt (REQ-FND-084/085). */
export const SENDING_DOMAINS = ['mail.koovela.com', 'news.koovela.com'] as const;
export const DKIM_SELECTOR = 'resend';

type Resolver = (name: string) => Promise<string[][]>;

export async function txt(resolver: Resolver, name: string): Promise<string[]> {
  try {
    return (await resolver(name)).map((parts) => parts.join(''));
  } catch {
    return [];
  }
}

export async function checkMailDomain(domain: string, resolver: Resolver = resolveTxt): Promise<CheckResult[]> {
  const spf = (await txt(resolver, domain)).filter((r) => r.startsWith('v=spf1'));
  const dkim = (await txt(resolver, `${DKIM_SELECTOR}._domainkey.${domain}`)).filter((r) => /p=[A-Za-z0-9+/=]{20,}/.test(r));
  const dmarc = (await txt(resolver, `_dmarc.${domain}`)).filter((r) => r.startsWith('v=DMARC1'));
  const policy = /;\s*p=(\w+)/.exec(dmarc[0] ?? '')?.[1];
  return [
    result('spf', domain, spf.length === 1 && /[~-]all$/.test(spf[0] ?? ''), spf.join(' | ') || 'ausente'),
    result('dkim', domain, dkim.length >= 1, dkim.length ? 'ok' : 'ausente'),
    result('dmarc', domain, policy === 'quarantine' || policy === 'reject', dmarc[0] ?? 'ausente'),
  ];
}

/** Valida o conteúdo do security.txt (RFC 9116). Devolve os dias até expirar. */
export function parseSecurityTxt(body: string, now = new Date()): { ok: boolean; detail: string; days?: number } {
  const contact = /^Contact:\s*(\S+)/im.exec(body)?.[1];
  const expires = /^Expires:\s*(\S+)/im.exec(body)?.[1];
  if (contact !== 'mailto:seguranca@koovela.com') return { ok: false, detail: `Contact inválido: ${contact ?? 'ausente'}` };
  if (!expires || Number.isNaN(Date.parse(expires))) return { ok: false, detail: 'Expires ausente ou inválido' };
  const days = Math.floor((Date.parse(expires) - now.getTime()) / 86_400_000);
  if (days < 0) return { ok: false, detail: `expirou há ${-days} dias`, days };
  if (days > 366) return { ok: false, detail: 'Expires acima de 1 ano (RFC 9116)', days };
  return { ok: true, detail: `expira em ${days} dias`, days };
}

export async function checkEmailSecurity(fetchFn: Fetch = fetch, resolver: Resolver = resolveTxt) {
  const results: CheckResult[] = [];
  const metrics: Record<string, number> = {};
  for (const d of SENDING_DOMAINS) results.push(...(await checkMailDomain(d, resolver)));
  const url = 'https://koovela.com/.well-known/security.txt';
  try {
    const res = await fetchFn(url);
    const parsed = parseSecurityTxt(await res.text());
    results.push(result('security.txt', url, res.ok && parsed.ok, parsed.detail));
    if (parsed.days !== undefined) metrics.koovela_security_txt_expiry_days = parsed.days;
  } catch (e) {
    results.push(result('security.txt', url, false, e instanceof Error ? e.message : String(e)));
  }
  return { results, metrics };
}
