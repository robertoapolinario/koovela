import * as Sentry from '@sentry/node';
import { redactValue } from '@koovela/platform-logger';

/**
 * Sentry (plano gratuito) com mascaramento antes do envio (REQ-FND-044): mesma regra do logger,
 * sem IP, sem cookies, sem corpo de requisição.
 */
export function sentryBeforeSend<E extends Sentry.ErrorEvent>(event: E): E {
  const e = redactValue(event) as E;
  if (e.user) e.user = e.user.id ? { id: e.user.id } : {};
  if (e.request) {
    delete e.request.cookies;
    delete e.request.data;
    if (e.request.headers) {
      const { 'user-agent': ua, 'x-correlation-id': corr } = e.request.headers as Record<string, string>;
      e.request.headers = { ...(ua ? { 'user-agent': ua } : {}), ...(corr ? { 'x-correlation-id': corr } : {}) };
    }
  }
  return e;
}

export function initSentry(opts: { dsn?: string | undefined; service: string; version: string; env: string }): void {
  if (!opts.dsn) return;
  Sentry.init({
    dsn: opts.dsn,
    release: opts.version,
    environment: opts.env,
    serverName: opts.service,
    tracesSampleRate: 0,
    beforeSend: (event) => sentryBeforeSend(event),
  });
}
