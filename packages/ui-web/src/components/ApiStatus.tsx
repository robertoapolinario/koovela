import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { t } from '@koovela/i18n';
import { apiBaseFromHost, configureSdk, useGetHealth } from '@koovela/sdk';

/** Estado da API no rodapé, pelo SDK gerado (REQ-FND-070, T114). */
export function ApiStatus() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const q = useGetHealth({ query: { refetchInterval: 60_000, retry: false, enabled: mounted } });
  const state = !mounted || q.isPending
    ? 'unknown'
    : q.data?.status === 200
      ? q.data.data.status === 'ok'
        ? 'ok'
        : q.data.data.status
      : 'down';
  return (
    <p role="status" aria-live="polite" data-api-status={state}>
      {t(`shell.status_${state}`)}
    </p>
  );
}

/** Provider do TanStack Query + base da API do ambiente (api.<ambiente>.koovela.com). */
export function SdkProvider({ children }: { readonly children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  if (typeof window !== 'undefined') configureSdk({ baseUrl: apiBaseFromHost(window.location.hostname, window.location.protocol) });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
