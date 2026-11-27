import type { DomainModule } from '@koovela/platform-runtime';

/** Todos os domínios conhecidos. O processo carrega só os de KOOVELA_DOMAINS (D44). */
export const registry: Record<string, () => Promise<DomainModule>> = {
  platform: async () => (await import('@koovela/svc-platform')).domainModule,
};
