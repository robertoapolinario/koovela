import type { CspProfile } from '../surfaces.ts';
import { result, type CheckResult } from './types.ts';

/** HSTS com preload (≥ 1 ano), CSP restritiva, XFO DENY, nosniff, Referrer-Policy e Permissions-Policy (REQ-FND-032). */
export function checkSecurityHeaders(target: string, h: Headers, csp: CspProfile): CheckResult[] {
  const out: CheckResult[] = [];
  const hsts = h.get('strict-transport-security') ?? '';
  const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
  out.push(result('hsts', target, maxAge >= 31_536_000 && /includeSubDomains/i.test(hsts) && /preload/i.test(hsts), hsts || 'ausente'));

  const policy = h.get('content-security-policy') ?? '';
  const directives = new Map(policy.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v] as const));
  const def = directives.get('default-src') ?? [];
  const scripts = directives.get('script-src') ?? def;
  const restrictive =
    (def.includes("'none'") || def.includes("'self'")) &&
    !scripts.includes("'unsafe-inline'") &&
    !scripts.includes("'unsafe-eval'") &&
    !scripts.includes('*') &&
    (directives.get('frame-ancestors')?.includes("'none'") ?? false) &&
    (csp !== 'api' || def.includes("'none'"));
  out.push(result('csp', target, restrictive, policy || 'ausente'));

  out.push(result('x-frame-options', target, (h.get('x-frame-options') ?? '').toUpperCase() === 'DENY', h.get('x-frame-options') ?? 'ausente'));
  out.push(result('nosniff', target, (h.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff', h.get('x-content-type-options') ?? 'ausente'));
  const rp = (h.get('referrer-policy') ?? '').toLowerCase();
  out.push(result('referrer-policy', target, ['no-referrer', 'strict-origin', 'strict-origin-when-cross-origin', 'same-origin'].includes(rp), rp || 'ausente'));
  const pp = h.get('permissions-policy') ?? '';
  out.push(result('permissions-policy', target, /camera=\(\)/.test(pp) && /microphone=\(\)/.test(pp) && /geolocation=/.test(pp), pp || 'ausente'));
  return out;
}

/** Staging e admin/bi: X-Robots-Tag noindex (REQ-FND-034/035). */
export function checkNoindex(target: string, h: Headers): CheckResult {
  const v = (h.get('x-robots-tag') ?? '').toLowerCase();
  return result('noindex', target, v.includes('noindex'), v || 'ausente');
}
