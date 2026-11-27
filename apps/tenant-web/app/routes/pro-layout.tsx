import { Outlet } from 'react-router';
import { t } from '@koovela/i18n';
import { ApiStatus, SidebarLayout, navItems } from '@koovela/ui-web';

/** Modo desktop do colaborador: painel.koovela.com/pro. */
const items = navItems('pro-desktop', { basePath: '/pro', homeKey: 'agenda' });

export default function ProLayout() {
  return (
    <SidebarLayout brand={t('shell.pro_brand')} navLabel={t('shell.nav_label')} items={items} footer={<ApiStatus />}>
      <Outlet />
    </SidebarLayout>
  );
}
