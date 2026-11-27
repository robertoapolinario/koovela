/**
 * Flags locais até a spec 004 (auditoria e flags) existir. C00 (aba Início) é da fase 2,
 * atrás de `discovery.home_tab` — desligada por padrão.
 */
const enabled = new Set((process.env.EXPO_PUBLIC_FLAGS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean));
export const isEnabled = (flag: string): boolean => enabled.has(flag);
