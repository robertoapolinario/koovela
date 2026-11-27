import { Outlet } from 'react-router';
import { t } from '@koovela/i18n';
import { SkipLink } from '@koovela/ui-web';

/** Onboarding O01–O05: fora do menu lateral, com cabeçalho simples. */
export default function OnboardingLayout() {
  return (
    <>
      <SkipLink />
      <header className="kv-topbar">
        <p className="kv-brand">{t('shell.tenant_brand')}</p>
      </header>
      <main id="conteudo" className="kv-main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
