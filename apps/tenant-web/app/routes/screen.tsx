import { useMatches } from 'react-router';
import { t } from '@koovela/i18n';
import { EmptyScreen, navigation } from '@koovela/ui-web';

/** Tela vazia genérica: o id da rota é o código da tela do protótipo. */
const labels = new Map<string, string>(
  Object.values(navigation.shells as unknown as Record<string, { items?: { screen: string; label_i18n: string }[] }>).flatMap((s) =>
    (s.items ?? []).map((i) => [i.screen, i.label_i18n] as [string, string]),
  ),
);

export function meta({ matches }: { matches: { id: string }[] }) {
  const code = matches.at(-1)?.id ?? '';
  return [{ title: `${labels.has(code) ? t(labels.get(code) as string) : code} · Koovela` }];
}

export default function Screen() {
  const code = useMatches().at(-1)?.id ?? '';
  const key = labels.get(code);
  return <EmptyScreen code={code} title={key ? t(key) : `${t('shell.onboarding_title')} ${code}`} />;
}
