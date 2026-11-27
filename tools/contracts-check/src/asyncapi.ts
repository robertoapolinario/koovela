import { parse } from 'yaml';

/**
 * Mudança incompatível em eventos, do ponto de vista de quem CONSOME (REQ-FND-071):
 * mensagem removida; propriedade removida; tipo alterado; propriedade obrigatória que deixou de ser;
 * valor novo em enum (quebra quem trata os casos de forma exaustiva).
 * Compara o payload resolvido ($ref locais e allOf) de cada mensagem, pelo `name` (event_type).
 */
export interface ContractVerdict {
  readonly file: string;
  readonly breaking: string[];
  readonly oldVersion: string;
  readonly newVersion: string;
  readonly ok: boolean;
}

const major = (v: string) => Number(v.split('.')[0] ?? 0);

export function verdict(file: string, breaking: string[], oldVersion: string, newVersion: string): ContractVerdict {
  return { file, breaking, oldVersion, newVersion, ok: breaking.length === 0 || major(newVersion) > major(oldVersion) };
}

type Schema = { type?: unknown; properties?: Record<string, Schema>; required?: string[]; enum?: unknown[]; items?: Schema; allOf?: Schema[]; $ref?: string };
type Doc = { info: { version: string }; components?: { messages?: Record<string, { name?: string; payload?: Schema }> }; channels?: Record<string, { messages?: Record<string, { $ref?: string; name?: string; payload?: Schema }> }> };

function resolve(doc: unknown, s: Schema | undefined, depth = 0): Schema {
  if (!s || depth > 20) return {};
  if (s.$ref?.startsWith('#/')) {
    const target = s.$ref.slice(2).split('/').reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], doc) as Schema;
    return resolve(doc, target, depth + 1);
  }
  if (s.allOf) {
    const parts = s.allOf.map((p) => resolve(doc, p, depth + 1));
    const merged: Schema = { properties: {}, required: [] };
    for (const p of parts) {
      if (p.type) merged.type = p.type;
      for (const [k, v] of Object.entries(p.properties ?? {})) {
        const prev = merged.properties?.[k];
        merged.properties![k] = prev ? resolve(doc, { allOf: [prev, v] }, depth + 1) : v;
      }
      merged.required = [...new Set([...(merged.required ?? []), ...(p.required ?? [])])];
      if (p.enum) merged.enum = p.enum;
      if (p.items) merged.items = p.items;
    }
    return merged;
  }
  const out: Schema = { ...s };
  if (s.properties) out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, resolve(doc, v, depth + 1)]));
  if (s.items) out.items = resolve(doc, s.items, depth + 1);
  return out;
}

function messages(doc: Doc): Map<string, Schema> {
  const out = new Map<string, Schema>();
  for (const [key, m] of Object.entries(doc.components?.messages ?? {})) out.set(m.name ?? key, resolve(doc, m.payload));
  return out;
}

const typeOf = (s: Schema) => JSON.stringify(s.type ?? null);

function compare(path: string, a: Schema, b: Schema, out: string[]): void {
  if (a.type !== undefined && typeOf(a) !== typeOf(b)) out.push(`${path}: tipo ${typeOf(a)} → ${typeOf(b)}`);
  for (const v of b.enum ?? []) if (a.enum && !a.enum.includes(v)) out.push(`${path}: valor novo no enum (${JSON.stringify(v)})`);
  for (const r of a.required ?? []) if (!(b.required ?? []).includes(r)) out.push(`${path}.${r}: deixou de ser obrigatório`);
  for (const [k, sa] of Object.entries(a.properties ?? {})) {
    const sb = b.properties?.[k];
    if (!sb) out.push(`${path}.${k}: removido`);
    else compare(`${path}.${k}`, sa, sb, out);
  }
  if (a.items && b.items) compare(`${path}[]`, a.items, b.items, out);
}

export function asyncapiBreaking(oldText: string, newText: string): { breaking: string[]; oldVersion: string; newVersion: string } {
  const a = parse(oldText) as Doc;
  const b = parse(newText) as Doc;
  const ma = messages(a);
  const mb = messages(b);
  const breaking: string[] = [];
  for (const [name, sa] of ma) {
    const sb = mb.get(name);
    if (!sb) breaking.push(`${name}: mensagem removida`);
    else compare(name, sa, sb, breaking);
  }
  return { breaking, oldVersion: String(a.info.version), newVersion: String(b.info.version) };
}

export async function checkAsyncapi(file: string, oldText: string, newText: string): Promise<ContractVerdict> {
  const r = asyncapiBreaking(oldText, newText);
  return verdict(file, r.breaking, r.oldVersion, r.newVersion);
}
