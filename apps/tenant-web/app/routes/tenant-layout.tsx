import { Outlet } from 'react-router';
import { t } from '@koovela/i18n';
import { ApiStatus, SidebarLayout, navItems } from '@koovela/ui-web';

const items = navItems('tenant-web', { homeKey: 'home' });

function BranchSelector() {
  return (
    <label>
      <span className="kv-visually-hidden">{t('shell.branch_selector')} </span>
      <select className="kv-select" aria-label={t('shell.branch_selector')} defaultValue="centro">
        <option value="centro">{t('shell.branch_example')}</option>
      </select>
    </label>
  );
}

export default function TenantLayout() {
  return (
    <SidebarLayout brand={t('shell.tenant_brand')} navLabel={t('shell.nav_label')} items={items} header={<BranchSelector />} footer={<ApiStatus />}>
      <Outlet />
    </SidebarLayout>
  );
}
