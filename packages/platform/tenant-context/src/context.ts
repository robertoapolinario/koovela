import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto da requisição ou da mensagem corrente (REQ-FND-006). `tenant_id` fica reservado:
 * a resolução de tenant é das specs 002/003.
 */
export interface RequestContext {
  readonly request_id: string;
  readonly correlation_id: string;
  readonly tenant_id?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function currentContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requireContext(): RequestContext {
  const c = storage.getStore();
  if (!c) throw new Error('sem contexto de requisição');
  return c;
}
