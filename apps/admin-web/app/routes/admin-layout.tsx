import { Outlet } from 'react-router';
import { t } from '@koovela/i18n';
import { ApiStatus, SidebarLayout, navItems } from '@koovela/ui-web';

const items = navItems('admin-web', { homeKey: 'overview' });

/** admin.X.koovela.com → bi.X.koovela.com (mesmo ambiente). */
const biHost = (external: string) =>
  typeof window === 'undefined' ? external : window.location.hostname.replace(/^admin\./, 'bi.');

export default function AdminLayout() {
  return (
    <SidebarLayout brand={t('shell.admin_brand')} navLabel={t('shell.nav_label')} items={items} theme="dark" hostFor={biHost} footer={<ApiStatus />}>
      <Outlet />
    </SidebarLayout>
  );
}
