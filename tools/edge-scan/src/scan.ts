import { checkNoindex, checkSecurityHeaders } from './checks/headers.ts';
import { checkAccessRequired, checkHttpsOnly, checkWwwRedirect } from './checks/http.ts';
import { checkResolves, checkTls } from './checks/tls.ts';
import type { CheckResult, Fetch } from './checks/types.ts';
import { SURFACES, type Env } from './surfaces.ts';

export interface ScanOutput {
  readonly results: CheckResult[];
  readonly metrics: Record<string, number>;
}

export async function scan(env: Env, fetchFn: Fetch = fetch): Promise<ScanOutput> {
  const results: CheckResult[] = [];
  const metrics: Record<string, number> = {};
  const apex = SURFACES.find((s) => s.name === 'apex')!.host(env);
  for (const s of SURFACES) {
    const host = s.host(env);
    const url = `https://${host}${s.path ?? ''}`;
    if (s.name === 'dev' && env === 'staging') continue;
    results.push(await checkResolves(host));
    if (s.reserved || s.external) continue;
    if (s.name === 'www') {
      results.push(await checkWwwRedirect(fetchFn, `https://${host}`, `https://${apex}`));
      continue;
    }
    const tls = await checkTls(host);
    results.push(tls);
    if ('days' in tls && typeof tls.days === 'number') metrics[`koovela_edge_cert_expiry_days{host="${host}"}`] = tls.days;
    results.push(await checkHttpsOnly(fetchFn, `http://${host}${s.path ?? ''}`));
    if (s.access) {
      results.push(await checkAccessRequired(fetchFn, url));
      continue;
    }
    const res = await fetchFn(url, { redirect: 'manual' });
    if (s.name !== 'security-txt') results.push(...checkSecurityHeaders(url, res.headers, s.csp));
    if (env === 'staging' || s.noindexAlways) results.push(checkNoindex(url, res.headers));
  }
  return { results, metrics };
}
