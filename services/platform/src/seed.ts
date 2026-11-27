import type { Kysely } from 'kysely';
import { generate } from '@koovela/testing';
import type { PlatformDb } from './domain.ts';

/** Semente sintética do domínio de exemplo: sempre os mesmos 20 registros (REQ-FND-003). */
export function platformSeedRows() {
  return generate(20, (f) => ({
    ping_id: f.string.uuid(),
    label: `${f.word.adjective()} ${f.word.noun()}`.slice(0, 120),
  }));
}

export async function seedPlatform(db: Kysely<PlatformDb>): Promise<number> {
  const rows = platformSeedRows();
  for (const r of rows) {
    await db
      .insertInto('platform_pings')
      .values({ ping_id: r.ping_id, label: r.label, synthetic: true, received_at: null })
      .onDuplicateKeyUpdate({ label: r.label, synthetic: true })
      .execute();
  }
  return rows.length;
}
