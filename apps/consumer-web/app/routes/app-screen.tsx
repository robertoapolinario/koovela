import { useMatches } from 'react-router';
import { EmptyScreen, navItems } from '@koovela/ui-web';

const items = navItems('consumer-web');

export function meta({ location }: { location: { pathname: string } }) {
  const item = items.find((i) => i.path === location.pathname);
  return [{ title: `${item?.label ?? ''} · Koovela` }];
}

export default function AppScreen() {
  const code = useMatches().at(-1)?.id ?? '';
  const item = items.find((i) => i.screen === code);
  return <EmptyScreen code={code} title={item?.label ?? code} />;
}
