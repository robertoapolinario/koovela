/**
 * Transporte único do SDK: base da API do ambiente + X-Correlation-Id. É o ÚNICO lugar que chama fetch
 * no código de cliente (regra koovela/no-raw-fetch).
 */
let baseUrl = '';

export function configureSdk(opts: { baseUrl: string }): void {
  baseUrl = opts.baseUrl.replace(/\/$/, '');
}

/** api.<ambiente>.koovela.com a partir do host atual da web (app., painel., admin. ou apex). */
export function apiBaseFromHost(hostname: string, protocol = 'https:'): string {
  const apex = hostname.replace(/^(app|painel|admin|bi)\./, '');
  return `${protocol}//api.${apex}`;
}

export async function koovelaFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl}${url}`, { ...init, headers: { accept: 'application/json', ...init.headers } });
  const body = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  return { data: body, status: res.status, headers: res.headers } as T;
}
