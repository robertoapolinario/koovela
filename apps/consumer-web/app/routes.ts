import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

/**
 * Um app, dois hosts (decidido nos loaders pelo Host):
 * - app.koovela.com → shell do consumidor (barra superior W06/W16/W17/W20);
 * - koovela.com → institucional e /{slug}[/{filial}] (W07).
 * Os caminhos do shell são slugs reservados (lista em app/slug.ts; a 005 bloqueia o cadastro).
 */
export default [
  index('routes/index.tsx'),
  layout('routes/app-layout.tsx', [
    route('appointments', 'routes/app-screen.tsx', { id: 'W06' }),
    route('series', 'routes/app-screen.tsx', { id: 'W16' }),
    route('loyalty', 'routes/app-screen.tsx', { id: 'W17' }),
    route('profile', 'routes/app-screen.tsx', { id: 'W20' }),
  ]),
  route(':slug', 'routes/public-slug.tsx', { id: 'W07' }),
  route(':slug/:branch', 'routes/public-slug.tsx', { id: 'W07-branch' }),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
