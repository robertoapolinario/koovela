import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { sql, type Kysely } from 'kysely';
import { createEnvelope, enqueue, newId } from '@koovela/platform-outbox';

/**
 * Registro de incidentes para o MTTR (T130): o Alertmanager chama o webhook; alerta crítico em
 * `firing` abre `platform_incident`; em `resolved` fecha e publica platform.incident.resolved.v1
 * (só ids e tempos) para o BI (023).
 */
export const EVENT_INCIDENT_RESOLVED = 'platform.incident.resolved.v1';
export const INCIDENTS_EXCHANGE = 'platform.incidents';

export interface IncidentsDb {
  platform_incident: {
    incident_id: string;
    fingerprint: string;
    alertname: string;
    severity: string;
    service: string | null;
    started_at: Date;
    resolved_at: Date | null;
  };
}

export interface AlertmanagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  fingerprint: string;
}

export async function handleAlerts(db: Kysely<IncidentsDb>, alerts: readonly AlertmanagerAlert[], correlationId: string): Promise<{ opened: number; resolved: number }> {
  let opened = 0;
  let resolved = 0;
  for (const a of alerts) {
    if (a.labels.severity !== 'critical') continue;
    if (a.status === 'firing') {
      const res = await sql`INSERT IGNORE INTO platform_incident (incident_id, fingerprint, alertname, severity, service, started_at)
        VALUES (${newId()}, ${a.fingerprint}, ${a.labels.alertname ?? 'desconhecido'}, 'critical', ${a.labels.service ?? a.labels.service_name ?? null}, ${new Date(a.startsAt)})`.execute(db);
      opened += Number(res.numAffectedRows ?? 0n);
      continue;
    }
    await db.transaction().execute(async (trx) => {
      const open = await trx
        .selectFrom('platform_incident')
        .selectAll()
        .where('fingerprint', '=', a.fingerprint)
        .where('resolved_at', 'is', null)
        .forUpdate()
        .executeTakeFirst();
      if (!open) return;
      const resolvedAt = a.endsAt && !a.endsAt.startsWith('0001') ? new Date(a.endsAt) : new Date();
      await trx.updateTable('platform_incident').set({ resolved_at: resolvedAt }).where('incident_id', '=', open.incident_id).execute();
      const env = createEnvelope({
        event_type: EVENT_INCIDENT_RESOLVED,
        correlation_id: correlationId,
        actor: { type: 'system', id: 'alertmanager' },
        data: {
          incident_id: open.incident_id,
          severity: 'critical',
          service: open.service,
          started_at: open.started_at.toISOString(),
          resolved_at: resolvedAt.toISOString(),
          duration_seconds: Math.max(0, Math.round((resolvedAt.getTime() - open.started_at.getTime()) / 1000)),
        },
      });
      await enqueue(trx, 'platform', INCIDENTS_EXCHANGE, env, { 'x-correlation-id': correlationId });
      resolved += 1;
    });
  }
  return { opened, resolved };
}

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Rota interna (fora de /v1) chamada pelo Alertmanager, só pela VCN e com token. */
export function incidentsRoutes(app: FastifyInstance, db: Kysely<IncidentsDb>, token: string | undefined, correlationId: () => string): void {
  app.post('/internal/platform/alertmanager', async (req, reply) => {
    const auth = req.headers.authorization ?? '';
    if (!token || !sameToken(auth, `Bearer ${token}`)) return reply.status(401).send();
    const body = req.body as { alerts?: AlertmanagerAlert[] } | undefined;
    if (!Array.isArray(body?.alerts)) return reply.status(400).send();
    return reply.send(await handleAlerts(db, body.alerts, correlationId()));
  });
}
