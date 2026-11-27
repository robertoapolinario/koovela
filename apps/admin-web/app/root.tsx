import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from 'react-router';
import { t } from '@koovela/i18n';
import { SdkProvider } from '@koovela/ui-web';
import '@koovela/ui-web/styles.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <SdkProvider>
      <Outlet />
    </SdkProvider>
  );
}

export function HydrateFallback() {
  return null;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id="conteudo" className="kv-main">
      <section className="kv-empty">
        <h1>{notFound ? t('shell.not_found_title') : t('errors.platform.internal_error.title')}</h1>
      </section>
    </main>
  );
}
