/** Endereços canônicos da CONST 3 e o que a borda deve garantir em cada um (REQ-FND-030 a 036). */
export type Env = 'staging' | 'production';
export type CspProfile = 'web' | 'api' | 'static';

export interface Surface {
  readonly name: string;
  readonly host: (env: Env) => string;
  readonly path?: string;
  readonly csp: CspProfile;
  /** Exige Cloudflare Access (MFA) antes da aplicação. */
  readonly access?: boolean;
  /** Nunca indexado, em qualquer ambiente. */
  readonly noindexAlways?: boolean;
  /** Reservado: só precisa resolver na borda (sem aplicação). */
  readonly reserved?: boolean;
  /** Hospedado fora da OCI (ex.: status). */
  readonly external?: boolean;
}

const sub = (s: string) => (env: Env) => (env === 'production' ? `${s}.koovela.com` : `${s}.staging.koovela.com`);
const apex = (env: Env) => (env === 'production' ? 'koovela.com' : 'staging.koovela.com');

export const SURFACES: readonly Surface[] = [
  { name: 'apex', host: apex, csp: 'web' },
  { name: 'slug', host: apex, path: '/exemplo-sintetico', csp: 'web' },
  { name: 'app', host: sub('app'), csp: 'web' },
  { name: 'painel', host: sub('painel'), csp: 'web' },
  { name: 'painel-pro', host: sub('painel'), path: '/pro', csp: 'web' },
  { name: 'api', host: sub('api'), path: '/v1/health', csp: 'api' },
  { name: 'admin', host: sub('admin'), csp: 'web', access: true, noindexAlways: true },
  { name: 'bi', host: sub('bi'), csp: 'static', access: true, noindexAlways: true },
  { name: 'cdn', host: sub('cdn'), csp: 'static', reserved: true },
  { name: 'parceiros', host: sub('parceiros'), csp: 'static', reserved: true },
  { name: 'status', host: () => 'status.koovela.com', csp: 'static', external: true },
  { name: 'security-txt', host: apex, path: '/.well-known/security.txt', csp: 'static' },
  { name: 'www', host: (env) => (env === 'production' ? 'www.koovela.com' : 'www.staging.koovela.com'), csp: 'web' },
  { name: 'dev', host: () => 'dev.koovela.com', csp: 'static', reserved: true },
];
