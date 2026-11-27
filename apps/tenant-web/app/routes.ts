import { index, layout, prefix, route, type RouteConfig } from '@react-router/dev/routes';

/** painel.koovela.com: menu lateral P01…P26 com seletor de filial; /pro (KD1/KD3/KD4/KD5); onboarding O01–O05 fora do menu. */
const tenant: [string, string][] = [
  ['agenda', 'P03'], ['clients', 'P11'], ['catalog', 'P12'], ['team', 'P15'], ['loyalty', 'P20'],
  ['idle-slots', 'P08'], ['reviews', 'P24'], ['finance', 'P21'], ['invoices', 'P23'], ['settings', 'P26'],
];
const pro: [string, string][] = [['commissions', 'KD3'], ['time-off', 'KD4'], ['profile', 'KD5']];

export default [
  layout('routes/tenant-layout.tsx', [
    index('routes/screen.tsx', { id: 'P01' }),
    ...tenant.map(([path, id]) => route(path, 'routes/screen.tsx', { id })),
  ]),
  ...prefix('pro', [
    layout('routes/pro-layout.tsx', [index('routes/screen.tsx', { id: 'KD1' }), ...pro.map(([path, id]) => route(path, 'routes/screen.tsx', { id }))]),
  ]),
  ...prefix('onboarding', [
    layout('routes/onboarding-layout.tsx', ['O01', 'O02', 'O03', 'O04', 'O05'].map((id) => route(id.toLowerCase(), 'routes/screen.tsx', { id }))),
  ]),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
