import navigation from '@koovela/contracts/ui/shell-navigation.json' with { type: 'json' };
import { t } from '@koovela/i18n';

/** Itens de navegação de um shell, a partir do contrato de UI (REQ-FND-063). */
export type ShellKey = 'consumer-web' | 'tenant-web' | 'admin-web' | 'pro-desktop' | 'consumer-mobile' | 'pro-mobile';

export interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly screen: string;
  readonly path: string;
  readonly externalHost?: string;
  readonly flag?: string;
}

interface RawItem {
  key: string;
  label_i18n: string;
  screen: string;
  external_host?: string;
  flag?: string;
}

export function navItems(shell: ShellKey, opts: { basePath?: string; homeKey?: string } = {}): NavItem[] {
  const raw = (navigation.shells as unknown as Record<string, { items: RawItem[] }>)[shell];
  if (!raw) throw new Error(`shell desconhecido: ${shell}`);
  const base = opts.basePath ?? '';
  return raw.items.map((i) => ({
    key: i.key,
    label: t(i.label_i18n),
    screen: i.screen,
    path: i.key === opts.homeKey ? base || '/' : `${base}/${i.key.replace(/_/g, '-')}`,
    ...(i.external_host ? { externalHost: i.external_host } : {}),
    ...(i.flag ? { flag: i.flag } : {}),
  }));
}

export { navigation };
