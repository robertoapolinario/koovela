export * from './domain.ts';
export { platformPlugin } from './plugin.ts';
export { platformSeedRows, seedPlatform } from './seed.ts';
export { EVENT_INCIDENT_RESOLVED, INCIDENTS_EXCHANGE, handleAlerts, type AlertmanagerAlert, type IncidentsDb } from './incidents/incidents.ts';
export const migrationsDir = new URL('../migrations/', import.meta.url);

import type { DomainModule } from '@koovela/platform-runtime';
import { onPinged as handlePinged, TOPOLOGY as topology, DOMAIN as name } from './domain.ts';
import { platformPlugin as plugin } from './plugin.ts';

export const domainModule: DomainModule = {
  name,
  plugin,
  hasOutbox: true,
  consumers: [{ topology, handle: handlePinged }],
};
