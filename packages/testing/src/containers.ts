import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';

/**
 * Imagens fixadas (REQ-FND-004). As mesmas versões do infra/compose/dev.yml;
 * o Dependabot atualiza as duas.
 */
export const IMAGES = {
  mysql: 'mysql:8.4.11',
  redis: 'redis:7.4.10-alpine',
  rabbitmq: 'rabbitmq:4.2.3-management-alpine',
} as const;

export async function startMysql(): Promise<StartedMySqlContainer> {
  return new MySqlContainer(IMAGES.mysql)
    .withRootPassword('test-root')
    .withCommand(['--character-set-server=utf8mb4', '--collation-server=utf8mb4_0900_ai_ci', '--default-time-zone=+00:00'])
    .start();
}

export async function startRedis(): Promise<StartedRedisContainer> {
  return new RedisContainer(IMAGES.redis).start();
}

export async function startRabbit(): Promise<StartedRabbitMQContainer> {
  return new RabbitMQContainer(IMAGES.rabbitmq).start();
}

export type { StartedMySqlContainer, StartedRabbitMQContainer, StartedRedisContainer };
