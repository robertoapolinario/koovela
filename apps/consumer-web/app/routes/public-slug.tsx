import { data, redirect, useLoaderData } from 'react-router';
import { t } from '@koovela/i18n';
import { ApiStatus, EmptyScreen } from '@koovela/ui-web';
import { isAppHost } from '../host.ts';
import { RESERVED_SLUGS, SYNTHETIC_SLUGS, normalizeSlug } from '../slug.ts';
import type { Route } from './+types/public-slug';

export function loader({ params, request }: Route.LoaderArgs) {
  if (isAppHost(request)) throw data(null, { status: 404 });
  const slug = normalizeSlug(params.slug ?? '');
  const branch = params.branch ? normalizeSlug(params.branch) : undefined;
  if (slug !== params.slug || (params.branch !== undefined && branch !== params.branch)) {
    throw redirect(`/${slug}${branch ? `/${branch}` : ''}`, 301);
  }
  const branches = RESERVED_SLUGS.has(slug) ? undefined : SYNTHETIC_SLUGS.get(slug);
  if (!branches || (branch && !branches.includes(branch))) throw data(null, { status: 404 });
  return { slug, branch };
}

export function meta({ data: d }: Route.MetaArgs) {
  return [{ title: `${d?.slug ?? ''} · Koovela` }, { property: 'og:url', content: `https://koovela.com/${d?.slug ?? ''}` }];
}

export default function PublicSlug() {
  const { slug, branch } = useLoaderData<typeof loader>();
  return (
    <>
    <main id="conteudo" className="kv-main">
      <EmptyScreen code="W07" title={`${t('shell.public_page_title')}: ${slug}${branch ? ` / ${branch}` : ''}`} />
    </main>
    <footer className="kv-footer">
      <ApiStatus />
    </footer>
    </>
  );
}
