import { connect } from 'node:tls';
import { resolve4, resolve6 } from 'node:dns/promises';
import { result, type CheckResult } from './types.ts';

/** O nome resolve (REQ-FND-030). */
export async function checkResolves(host: string): Promise<CheckResult> {
  const v4 = await resolve4(host).catch(() => []);
  const v6 = await resolve6(host).catch(() => []);
  return result('resolves', host, v4.length + v6.length > 0, [...v4, ...v6].slice(0, 3).join(', ') || 'não resolve');
}

/** Dias até o certificado expirar (métrica koovela_edge_cert_expiry_days). */
export function certExpiryDays(host: string, port = 443): Promise<number> {
  return new Promise((resolveP, reject) => {
    const s = connect({ host, port, servername: host, timeout: 8000 }, () => {
      const cert = s.getPeerCertificate();
      s.end();
      if (!cert?.valid_to) return reject(new Error('sem certificado'));
      resolveP(Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000));
    });
    s.on('error', reject);
    s.on('timeout', () => s.destroy(new Error('timeout')));
  });
}

export async function checkTls(host: string, minDays = 30): Promise<CheckResult & { days?: number }> {
  try {
    const days = await certExpiryDays(host);
    return { ...result('tls', host, days >= minDays, `expira em ${days} dias`), days };
  } catch (e) {
    return result('tls', host, false, e instanceof Error ? e.message : String(e));
  }
}
