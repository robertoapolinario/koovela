import { result, type CheckResult, type Fetch } from './types.ts';

/** `www` → apex com 301 preservando caminho e parâmetros (REQ-FND-031). */
export async function checkWwwRedirect(fetchFn: Fetch, wwwBase: string, apexBase: string): Promise<CheckResult> {
  const res = await fetchFn(`${wwwBase}/caminho/teste?x=1&y=2`, { redirect: 'manual' });
  const loc = res.headers.get('location') ?? '';
  const ok = res.status === 301 && loc === `${apexBase}/caminho/teste?x=1&y=2`;
  return result('www-redirect', wwwBase, ok, `${res.status} ${loc}`);
}

/** HTTP puro nunca serve conteúdo: redireciona para HTTPS (REQ-FND-032). */
export async function checkHttpsOnly(fetchFn: Fetch, httpUrl: string): Promise<CheckResult> {
  const res = await fetchFn(httpUrl, { redirect: 'manual' });
  const loc = res.headers.get('location') ?? '';
  return result('https-only', httpUrl, [301, 308].includes(res.status) && loc.startsWith('https://'), `${res.status} ${loc}`);
}

/** admin/bi: sem sessão do Access a aplicação não é alcançada (REQ-FND-034). */
export async function checkAccessRequired(fetchFn: Fetch, url: string): Promise<CheckResult> {
  const res = await fetchFn(url, { redirect: 'manual' });
  const loc = res.headers.get('location') ?? '';
  const ok = (res.status === 302 && /\.cloudflareaccess\.com\/cdn-cgi\/access\/login/.test(loc)) || res.status === 403;
  return result('access-required', url, ok, `${res.status} ${loc}`);
}

/** A origem não aceita tráfego direto (REQ-FND-033): o IP/host de origem deve recusar a conexão. */
export async function checkOriginClosed(fetchFn: Fetch, originUrl: string): Promise<CheckResult> {
  try {
    const res = await fetchFn(originUrl, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    return result('origin-closed', originUrl, false, `respondeu ${res.status}`);
  } catch {
    return result('origin-closed', originUrl, true, 'sem resposta (esperado)');
  }
}
