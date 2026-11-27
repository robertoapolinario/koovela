import { redirect } from 'react-router';
import { t } from '@koovela/i18n';
import { isAppHost } from '../host.ts';
import type { Route } from './+types/index';

export function loader({ request }: Route.LoaderArgs) {
  if (isAppHost(request)) throw redirect('/appointments');
  return null;
}

export const meta = () => [{ title: 'Koovela' }];

/** koovela.com: institucional esqueleto (a vitrine D26 chega na fase 2). */
export default function Index() {
  return (
    <main id="conteudo" className="kv-main">
      <section className="kv-empty">
        <h1>{t('shell.public_institutional_title')}</h1>
        <p>{t('shell.public_institutional_body')}</p>
      </section>
    </main>
  );
}
