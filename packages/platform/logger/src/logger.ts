import { pino, type Logger, type LoggerOptions } from 'pino';
import { redactString, redactValue } from './redaction.ts';

export interface LogContext {
  readonly request_id?: string;
  readonly correlation_id?: string;
  readonly tenant_id?: string;
}

export interface CreateLoggerOptions {
  readonly service: string;
  readonly level?: string;
  /** Nomes de chaves de configuração secretas, mascaradas se aparecerem em qualquer objeto. */
  readonly secretKeys?: readonly string[];
  readonly destination?: pino.DestinationStream;
  /** Lê o contexto da requisição corrente (tenant-context). */
  readonly context?: () => LogContext | undefined;
}

/**
 * Logger JSON estruturado (REQ-FND-040/041/081): `service`, `request_id`, `correlation_id`
 * e `tenant_id` quando houver; mascara PII por campo e por padrão; nunca imprime env.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const secret = new Set(options.secretKeys ?? []);
  const opts: LoggerOptions = {
    level: options.level ?? 'info',
    base: { service: options.service },
    messageKey: 'msg',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    hooks: {
      // Mascaramento na linha final, depois dos serializadores (req, res, err): nada sai sem passar aqui.
      streamWrite: (line) => {
        try {
          return `${JSON.stringify(redactValue(JSON.parse(line), secret))}\n`;
        } catch {
          return redactString(line);
        }
      },
    },
    ...(options.context ? { mixin: () => ({ ...options.context?.() }) } : {}),
  };
  return options.destination ? pino(opts, options.destination) : pino(opts);
}

export type { Logger };
