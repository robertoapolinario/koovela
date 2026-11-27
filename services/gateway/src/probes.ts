import amqp from 'amqplib';
import type { Redis } from 'ioredis';
import { createConnection } from 'mysql2/promise';
import type { Probe } from '@koovela/platform-health';

export function mysqlProbe(cfg: { host: string; port: number; user: string; password: string }): Probe {
  return {
    name: 'mysql',
    required: true,
    check: async () => {
      const c = await createConnection({ ...cfg, connectTimeout: 1500 });
      try {
        await c.query('SELECT 1');
      } finally {
        await c.end();
      }
    },
  };
}

export const redisProbe = (redis: Redis): Probe => ({
  name: 'redis',
  required: true,
  check: async () => {
    if ((await redis.ping()) !== 'PONG') throw new Error('redis');
  },
});

export const rabbitProbe = (url: string): Probe => ({
  name: 'rabbitmq',
  required: true,
  check: async () => {
    const c = await amqp.connect(url, { timeout: 1500 });
    await c.close();
  },
});

export const coreProbe = (coreUrl: string): Probe => ({
  name: 'core',
  required: true,
  check: async () => {
    const res = await fetch(new URL('/livez', coreUrl), { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error(`core ${res.status}`);
  },
});
