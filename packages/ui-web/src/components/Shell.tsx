import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { t } from '@koovela/i18n';
import type { NavItem } from '../nav.ts';

function Nav({ items, label, hostFor }: { items: readonly NavItem[]; label: string; hostFor?: (external: string) => string }) {
  return (
    <nav className="kv-nav" aria-label={label}>
      <ul>
        {items.map((i) => (
          <li key={i.key}>
            {i.externalHost ? (
              <a href={`https://${hostFor ? hostFor(i.externalHost) : i.externalHost}`} rel="noopener">
                {i.label}
              </a>
            ) : (
              <NavLink to={i.path} end={i.path === '/' || i.path.split('/').length <= 2}>
                {i.label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SkipLink() {
  return (
    <a className="kv-skip" href="#conteudo">
      {t('shell.skip_to_content')}
    </a>
  );
}

/** Painel e back-office: menu lateral (Figma: Barra lateral · Painel do Cliente / Back-office). */
export function SidebarLayout(props: {
  readonly brand: string;
  readonly navLabel: string;
  readonly items: readonly NavItem[];
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly theme?: 'light' | 'dark';
  readonly hostFor?: (external: string) => string;
  readonly children: ReactNode;
}) {
  return (
    <div className="kv-sidebar-layout">
      <SkipLink />
      <aside className="kv-sidebar" data-theme={props.theme ?? 'light'}>
        <p className="kv-brand">{props.brand}</p>
        <Nav items={props.items} label={props.navLabel} {...(props.hostFor ? { hostFor: props.hostFor } : {})} />
      </aside>
      <div>
        {props.header ? <header className="kv-header">{props.header}</header> : null}
        <main id="conteudo" className="kv-main" tabIndex={-1}>
          {props.children}
        </main>
        {props.footer ? <footer className="kv-footer">{props.footer}</footer> : null}
      </div>
    </div>
  );
}

/** Web do consumidor: barra superior (Figma: Barra superior · Web). */
export function TopBarLayout(props: { readonly brand: string; readonly navLabel: string; readonly items: readonly NavItem[]; readonly footer?: ReactNode; readonly children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header className="kv-topbar">
        <p className="kv-brand">{props.brand}</p>
        <Nav items={props.items} label={props.navLabel} />
      </header>
      <main id="conteudo" className="kv-main" tabIndex={-1}>
        {props.children}
      </main>
      {props.footer ? <footer className="kv-footer">{props.footer}</footer> : null}
    </>
  );
}

/** Tela vazia que mostra o código da tela do protótipo (REQ-FND-063). */
export function EmptyScreen({ code, title }: { readonly code: string; readonly title: string }) {
  return (
    <section className="kv-empty" aria-labelledby="titulo-tela">
      <h1 id="titulo-tela">{title}</h1>
      <p className="kv-code" data-screen-code={code}>
        {t('shell.empty_screen', { code })}
      </p>
    </section>
  );
}
