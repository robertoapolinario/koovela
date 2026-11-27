import { createRequestHandler } from '@react-router/express';
import express from 'express';
import type { ServerBuild } from 'react-router';

/**
 * Servidor da web do consumidor: app.koovela.com (shell) e koovela.com (institucional, /{slug}, /.well-known).
 * O host decide o que cada rota mostra (app/host.ts). /healthz para o Traefik e o HEALTHCHECK.
 */
const PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT ?? (PROD ? 8080 : 5173));
const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// Links universais (REQ-FND-090): AASA sem extensão e com Content-Type application/json.
app.get('/.well-known/apple-app-site-association', (_req, res, next) => {
  res.type('application/json');
  next();
});
const staticOpts = { maxAge: '1h', index: false, dotfiles: 'allow' as const, setHeaders: (res: import('node:http').ServerResponse, path: string) => {
  if (path.endsWith('apple-app-site-association')) res.setHeader('content-type', 'application/json');
} };

let build: () => Promise<ServerBuild>;
if (PROD) {
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));
  app.use(express.static('build/client', staticOpts));
  build = () => import(new URL('./build/server/index.js', import.meta.url).href) as Promise<ServerBuild>;
} else {
  const vite = await import('vite').then((v) => v.createServer({ server: { middlewareMode: true } }));
  app.use(vite.middlewares);
  build = () => vite.ssrLoadModule('virtual:react-router/server-build') as Promise<ServerBuild>;
}

app.all('/{*splat}', createRequestHandler({ build }));

app.listen(PORT, '0.0.0.0', () => console.log(`consumer-web em :${PORT}`));
