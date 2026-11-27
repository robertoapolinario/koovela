#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, statfsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compose as composeRaw, envFileFor, run, services, unhealthy } from './docker.ts';
import { ensureEnv } from './env.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const FILE = join(ROOT, 'infra/compose/dev.yml');
const INFRA = ['mysql', 'redis', 'rabbitmq', 'traefik'];
const APPS = ['gateway', 'core', 'workers'];
const WEBS = ['consumer-web', 'tenant-web', 'admin-web'];
const GB = 1_000_000_000;
const compose = (file: string, a: readonly string[], quiet = false) => composeRaw(file, a, quiet, envFileFor(file));
function composeOrFail(a: readonly string[]): void {
  if (compose(FILE, a).status !== 0) fail(`docker compose ${a.join(' ')} falhou (veja a saída acima).`);
}

const args = process.argv.slice(2);
const cmd = args[0] ?? 'help';
const noWeb = args.includes('--no-web');

function fail(msg: string): never {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

/** Pré-requisitos (quickstart §1): Docker com Compose v2, ≥ 8 GB de RAM para o Docker e ≥ 20 GB de disco. */
function prerequisites(): void {
  const v = run('docker', ['compose', 'version', '--short'], { quiet: true });
  if (v.status !== 0) fail('Docker Compose v2 não encontrado. Instale o Colima (ou Docker Desktop) e o plugin compose.');
  const info = run('docker', ['info', '--format', '{{.MemTotal}}'], { quiet: true });
  if (info.status !== 0) fail('O Docker não está rodando. Inicie o Colima: `colima start --cpu 4 --memory 8`.');
  const mem = Number(info.stdout.trim());
  if (mem < 8 * GB) fail(`O Docker tem ${(mem / GB).toFixed(1)} GB de RAM; são necessários ≥ 8 GB (colima start --memory 8).`);
  const fs = statfsSync(ROOT);
  const free = fs.bavail * fs.bsize;
  if (free < 20 * GB) fail(`Há ${(free / GB).toFixed(1)} GB livres em disco; são necessários ≥ 20 GB.`);
}

function waitHealthy(names: readonly string[], timeoutMs: number): void {
  const end = Date.now() + timeoutMs;
  let bad = [...names];
  while (Date.now() < end) {
    bad = unhealthy(services(FILE), names);
    if (bad.length === 0) return;
    spawnSleep(2);
  }
  const states = services(FILE);
  const detail = bad.map((n) => {
    const s = states.find((x) => x.Service === n);
    return `${n} (${s ? `${s.State}${s.Health ? `/${s.Health}` : ''}` : 'não criado'})`;
  });
  fail(`Componente(s) sem saúde: ${detail.join(', ')}. Veja os logs: docker compose -f infra/compose/dev.yml logs ${bad[0]}`);
}

function spawnSleep(seconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

function task(name: string): void {
  const r = compose(FILE, ['--profile', 'tasks', 'run', '--rm', '-T', name]);
  if (r.status !== 0) fail(`a tarefa "${name}" falhou (veja a saída acima).`);
}

function recordTime(kind: 'first' | 'next', seconds: number): void {
  const dir = join(homedir(), '.koovela');
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'up-times.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), kind, seconds })}\n`);
}

function up(): void {
  const started = Date.now();
  prerequisites();
  const envPath = join(ROOT, '.env');
  const first = !existsSync(envPath) || services(FILE).length === 0;
  const env = ensureEnv(join(ROOT, '.env.example'), envPath);
  if (env.filled.length > 0) console.log(`• .env local: ${env.filled.length} chave(s) preenchida(s) com valores só de desenvolvimento`);
  if (!existsSync(join(ROOT, 'node_modules'))) {
    console.log('• instalando dependências');
    if (run('pnpm', ['install', '--frozen-lockfile'], { cwd: ROOT }).status !== 0) fail('pnpm install falhou.');
  }
  console.log('• subindo banco, fila, cache e proxy');
  composeOrFail(['up', '-d', ...INFRA]);
  waitHealthy(INFRA, 180_000);
  console.log('• migrações');
  task('migrate');
  console.log('• semente sintética');
  task('seed');
  const procs = noWeb ? APPS : [...APPS, ...WEBS];
  console.log(`• subindo ${procs.join(', ')}`);
  composeOrFail(['up', '-d', ...procs]);
  waitHealthy([...INFRA, ...procs], 300_000);
  const seconds = Math.round((Date.now() - started) / 1000);
  recordTime(first ? 'first' : 'next', seconds);
  console.log(`\n✔ Ambiente no ar em ${Math.floor(seconds / 60)} min ${seconds % 60} s`);
  console.log('  http://koovela.localhost · http://app.koovela.localhost · http://painel.koovela.localhost');
  console.log('  http://admin.koovela.localhost · http://api.koovela.localhost/v1/health');
}

function doctor(): void {
  prerequisites();
  const states = services(FILE);
  const all = [...INFRA, ...APPS, ...WEBS];
  for (const n of all) {
    const s = states.find((x) => x.Service === n);
    const ok = s && s.State === 'running' && (s.Health === '' || s.Health === 'healthy');
    console.log(`${ok ? '✔' : '✖'} ${n.padEnd(14)} ${s ? `${s.State}${s.Health ? ` (${s.Health})` : ''}` : 'não criado'}`);
  }
  const bad = unhealthy(states, all);
  if (bad.length > 0) fail(`Componente(s) sem saúde: ${bad.join(', ')}`);
}

switch (cmd) {
  case 'up':
    up();
    break;
  case 'down':
    compose(FILE, ['down', '--remove-orphans']);
    break;
  case 'reset':
    console.log('• apagando volumes locais (dados sintéticos)');
    compose(FILE, ['down', '-v', '--remove-orphans']);
    up();
    break;
  case 'doctor':
    doctor();
    break;
  default:
    console.log('uso: pnpm koovela <up [--no-web] | down | reset | doctor>');
}
