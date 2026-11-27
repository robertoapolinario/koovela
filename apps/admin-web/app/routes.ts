import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

/** admin.koovela.com: menu G01…G10 + B01 (abre bi.koovela.com). Atrás do Cloudflare Access com MFA. */
const screens: [string, string][] = [
  ['tenants', 'G02'], ['schemas', 'G03'], ['onboarding-kyc', 'G04'], ['impersonation', 'G05'], ['grants', 'G06'],
  ['billing', 'G07'], ['antifraud', 'G08'], ['feature-flags', 'G09'], ['audit', 'G10'],
];

export default [
  layout('routes/admin-layout.tsx', [index('routes/screen.tsx', { id: 'G01' }), ...screens.map(([path, id]) => route(path, 'routes/screen.tsx', { id }))]),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
