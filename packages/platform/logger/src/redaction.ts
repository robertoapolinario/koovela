/**
 * Mascaramento de dados pessoais (CONST IV, REQ-FND-041): por nome de campo e por padrão de conteúdo.
 * Aplica-se a qualquer valor antes de sair do processo (log, trace, erro).
 */
export const REDACTED = '[redacted]';

const SENSITIVE_FIELD =
  /^(password|senha|secret|token|access_token|refresh_token|authorization|cookie|set-cookie|api_key|apikey|cpf|cnpj|rg|phone|telefone|celular|whatsapp|email|e_mail|card|card_number|cartao|cvv|birth_date|data_nascimento|address|endereco|cep|zip)$/i;

/** Padrões de PII usados no mascaramento e na varredura mensal dos logs (SC-008). */
export const PII_PATTERNS: readonly [RegExp, string][] = [
  // JWT
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, '[jwt]'],
  // e-mail
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  // CPF (com ou sem máscara)
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]'],
  // cartão (13 a 19 dígitos com separadores opcionais)
  [/\b(?:\d[ -]?){12,18}\d\b/g, '[card]'],
  // telefone BR: +55, DDD e 8 ou 9 dígitos
  [/(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/g, '[phone]'],
  // Bearer
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [token]'],
];

export function redactString(input: string): string {
  let out = input;
  for (const [re, rep] of PII_PATTERNS) out = out.replace(re, rep);
  return out;
}

/** IPv4 → /24; IPv6 → /48. */
export function truncateIp(ip: string): string {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.replace(/\.\d{1,3}$/, '.0');
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::`;
  return ip;
}

const IP_FIELD = /^(ip|remote_address|remoteAddress|client_ip|x-forwarded-for)$/i;

export function redactValue(value: unknown, extraSecretKeys: ReadonlySet<string> = new Set(), depth = 0): unknown {
  if (depth > 8) return '[depth]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, extraSecretKeys, depth + 1));
  if (value instanceof Error) {
    return { type: value.name, message: redactString(value.message), stack: value.stack ? redactString(value.stack) : undefined };
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_FIELD.test(k) || extraSecretKeys.has(k)) out[k] = REDACTED;
      else if (IP_FIELD.test(k) && typeof v === 'string') out[k] = truncateIp(v);
      else out[k] = redactValue(v, extraSecretKeys, depth + 1);
    }
    return out;
  }
  return value;
}
