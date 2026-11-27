import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { Probe } from '@koovela/platform-health';
import { buildGateway } from '../src/app.ts';

const contracts = fileURLToPath(new URL('../../../packages/contracts/', import.meta.url));
const openapi = parse(readFileSync(`${contracts}openapi/gateway.openapi.yaml`, 'utf8')) as {
  components: { schemas: Record<string, unknown> };
};
const ajv = new Ajv2020({ strict: false });
addFormats.default(ajv);
ajv.addSchema(JSON.parse(readFileSync(`${contracts}schemas/problem-details.schema.json`, 'utf8')), 'problem');
const schemas = JSON.parse(JSON.stringify(openapi.components.schemas).replaceAll('#/components/schemas/', 'gw#/$defs/'));
ajv.addSchema({ $id: 'gw', $defs: { ...schemas, Problem: { $ref: 'problem' } } });
const validateHealth = ajv.getSchema('gw#/$defs/Health')!;
const validateProblem = ajv.getSchema('problem')!;

const ok = (name: Probe['name']): Probe => ({ name, required: true, check: async () => {} });
const down = (name: Probe['name']): Probe => ({ name, required: true, check: async () => { throw new Error('x'); } });
const ORIGIN = 'http://app.koovela.localhost';

const build = (probes: Probe[] = [ok('mysql'), ok('redis'), ok('rabbitmq'), ok('core')], max = 100) =>
  buildGateway({ version: '2026.11.27-abc1234', corsAllowedOrigins: [ORIGIN], probes, rateLimit: { max, windowSeconds: 60 } });

describe('GET /v1/health', () => {
  it('200 conforme o contrato, com X-Request-Id', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(validateHealth(res.json()), JSON.stringify(validateHealth.errors)).toBe(true);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('503 em Problem Details quando dependência obrigatória cai', async () => {
    const app = await build([down('mysql'), ok('redis')]);
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(503);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(validateProblem(res.json())).toBe(true);
    expect(res.json()).toMatchObject({ code: 'platform.dependency_unavailable' });
  });
});

describe('correlation_id', () => {
  it('propaga o recebido e gera quando falta', async () => {
    const app = await build();
    const id = '0190a3e2-5b7c-7d2e-9f1a-1b2c3d4e5f60';
    const a = await app.inject({ method: 'GET', url: '/v1/health', headers: { 'x-correlation-id': id } });
    expect(a.headers['x-correlation-id']).toBe(id);
    const b = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(b.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('CORS', () => {
  it('aceita só a origem canônica', async () => {
    const app = await build();
    const good = await app.inject({ method: 'GET', url: '/v1/health', headers: { origin: ORIGIN } });
    expect(good.headers['access-control-allow-origin']).toBe(ORIGIN);
    const bad = await app.inject({ method: 'GET', url: '/v1/health', headers: { origin: 'https://evil.example' } });
    expect(bad.statusCode).toBe(403);
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
    expect(validateProblem(bad.json())).toBe(true);
  });
});

describe('rate limit', () => {
  it('429 com Retry-After e Problem Details', async () => {
    const app = await build(undefined, 2);
    await app.inject({ method: 'GET', url: '/v1/health' });
    await app.inject({ method: 'GET', url: '/v1/health' });
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(res.json()).toMatchObject({ code: 'platform.rate_limited', title: 'Muitas requisições' });
    expect(validateProblem(res.json())).toBe(true);
  });
});

describe('Redis do rate limit fora do ar', () => {
  it('o health responde 503 (dependência caída), nunca 500', async () => {
    const { Redis } = await import('ioredis');
    const redis = new Redis('redis://127.0.0.1:1', { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0 });
    const app = await buildGateway({
      version: 'v',
      corsAllowedOrigins: [],
      probes: [down('redis')],
      rateLimit: { max: 10, windowSeconds: 60, redis },
    });
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ code: 'platform.dependency_unavailable' });
    redis.disconnect();
  });
});

describe('rotas desconhecidas', () => {
  it('405 com Allow para método não declarado num caminho existente', async () => {
    const app = await build();
    const res = await app.inject({ method: 'POST', url: '/v1/health' });
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toContain('GET');
    expect(validateProblem(res.json())).toBe(true);
    const query = await app.inject({ method: 'QUERY' as never, url: '/v1/health' });
    expect(query.statusCode).toBe(405);
  });
  it('404 em Problem Details', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/v1/nada' });
    expect(res.statusCode).toBe(404);
    expect(validateProblem(res.json())).toBe(true);
  });
});
