/** Problem Details (RFC 9457) — REQ-FND-073. `code` estável em inglês; `title`/`detail` em pt-BR. */
export interface FieldError {
  readonly pointer: string;
  readonly code: string;
  readonly detail?: string;
}

export interface Problem {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly request_id: string;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: readonly FieldError[];
}

export type Translate = (key: string, vars?: Record<string, unknown>) => string;

const PROBLEM_BASE = 'https://api.koovela.com/problems/';

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly vars: Record<string, unknown>;
  readonly errors: readonly FieldError[] | undefined;
  constructor(code: string, status: number, options: { vars?: Record<string, unknown>; errors?: readonly FieldError[]; cause?: unknown } = {}) {
    super(code, { cause: options.cause });
    if (!/^[a-z]+(\.[a-z_]+)+$/.test(code)) throw new Error(`código de erro inválido: ${code}`);
    if (status < 400 || status > 599) throw new Error(`status inválido: ${status}`);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.vars = options.vars ?? {};
    this.errors = options.errors;
  }
}

export function toProblem(err: AppError, requestId: string, t: Translate, instance?: string): Problem {
  const slug = err.code.replace(/\./g, '-').replace(/_/g, '-');
  const detailKey = `errors.${err.code}.detail`;
  const detail = t(detailKey, err.vars);
  return {
    type: `${PROBLEM_BASE}${slug}`,
    title: t(`errors.${err.code}.title`, err.vars),
    status: err.status,
    code: err.code,
    request_id: requestId,
    ...(detail && detail !== detailKey ? { detail } : {}),
    ...(instance ? { instance } : {}),
    ...(err.errors && err.errors.length > 0 ? { errors: err.errors } : {}),
  };
}

/** Erros conhecidos da plataforma. */
export const PlatformErrors = {
  internal: () => new AppError('platform.internal_error', 500),
  notFound: () => new AppError('platform.not_found', 404),
  methodNotAllowed: () => new AppError('platform.method_not_allowed', 405),
  /** Erro 4xx do framework (corpo inválido, tipo não suportado, carga grande demais…), mantendo o status. */
  clientError: (status: number) =>
    new AppError(status === 413 ? 'platform.payload_too_large' : status === 415 ? 'platform.unsupported_media_type' : 'platform.bad_request', status >= 400 && status < 500 ? status : 400),
  validation: (errors: readonly FieldError[]) => new AppError('platform.validation_failed', 400, { errors }),
  rateLimited: (retryAfter: number) => new AppError('platform.rate_limited', 429, { vars: { retryAfter } }),
  dependencyUnavailable: (dependency: string) =>
    new AppError('platform.dependency_unavailable', 503, { vars: { dependency } }),
  originNotAllowed: () => new AppError('platform.origin_not_allowed', 403),
} as const;
