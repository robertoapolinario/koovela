import { Outlet, data } from 'react-router';
import { t } from '@koovela/i18n';
import { ApiStatus, TopBarLayout, navItems } from '@koovela/ui-web';
import { isAppHost } from '../host.ts';
import type { Route } from './+types/app-layout';

const items = navItems('consumer-web');

export function loader({ request }: Route.LoaderArgs) {
  if (!isAppHost(request)) throw data(null, { status: 404 });
  return null;
}

export default function AppLayout() {
  return (
    <TopBarLayout brand={t('shell.brand')} navLabel={t('shell.nav_label')} items={items} footer={<ApiStatus />}>
      <Outlet />
    </TopBarLayout>
  );
}
