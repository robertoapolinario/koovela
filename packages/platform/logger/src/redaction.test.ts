import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, truncateIp } from './index.ts';

function capture(secretKeys: string[] = []) {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  const log = createLogger({
    service: 'test',
    secretKeys,
    destination,
    context: () => ({ request_id: 'r-1', correlation_id: 'c-1', tenant_id: 't-1' }),
  });
  return { log, out: () => lines.join('') };
}

const PII = {
  cpf: '123.456.789-09',
  cpfRaw: '12345678909',
  phone: '(11) 98765-4321',
  phoneIntl: '+55 11 987654321',
  email: 'maria.silva@exemplo.com.br',
  card: '4111 1111 1111 1111',
  jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
  password: 'S3nh@Forte!',
};

describe('logger: nenhuma PII em claro', () => {
  it('mascara por nome de campo', () => {
    const { log, out } = capture();
    log.info({ cpf: PII.cpf, phone: PII.phone, email: PII.email, password: PII.password, card_number: PII.card }, 'cadastro');
    for (const v of Object.values(PII)) expect(out()).not.toContain(v);
  });

  it('mascara por padrão de conteúdo em campos livres e na mensagem', () => {
    const { log, out } = capture();
    log.info({ note: `cliente ${PII.cpfRaw} tel ${PII.phoneIntl} cartão ${PII.card}` }, `contato ${PII.email} token ${PII.jwt}`);
    for (const v of [PII.cpfRaw, PII.phoneIntl, PII.card, PII.email, PII.jwt]) expect(out()).not.toContain(v);
    expect(out()).toContain('[email]');
  });

  it('mascara dentro de objetos aninhados e erros', () => {
    const { log, out } = capture();
    log.error({ err: new Error(`falha para ${PII.email}`), user: { profile: { telefone: PII.phone } } }, 'erro');
    expect(out()).not.toContain(PII.email);
    expect(out()).not.toContain(PII.phone);
  });

  it('nunca imprime chave de configuração secreta', () => {
    const { log, out } = capture(['RABBITMQ_URL']);
    log.info({ RABBITMQ_URL: 'amqp://user:topsecret@rabbit' }, 'config');
    expect(out()).not.toContain('topsecret');
  });

  it('trunca IP e inclui os campos de contexto', () => {
    const { log, out } = capture();
    log.info({ ip: '203.0.113.42' }, 'req');
    const line = JSON.parse(out().trim()) as Record<string, unknown>;
    expect(line.ip).toBe('203.0.113.0');
    expect(line).toMatchObject({ service: 'test', request_id: 'r-1', correlation_id: 'c-1', tenant_id: 't-1' });
    expect(truncateIp('2001:db8:abcd:1234::1')).toBe('2001:db8:abcd::');
  });
});
