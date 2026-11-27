import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

/** Servidor estático com fallback de SPA (testes e2e). Uso: node tools/dev/spa-serve.ts <dir> <porta> */
const [dir = 'build/client', port = '4173'] = process.argv.slice(2);
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/healthz') return void res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
  let file = normalize(join(dir, decodeURIComponent(url.pathname)));
  if (!file.startsWith(normalize(dir)) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(port), '0.0.0.0');
