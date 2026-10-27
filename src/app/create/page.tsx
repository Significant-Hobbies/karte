import { redirect } from 'next/navigation';

import { CreatePageView } from '@/components/create/create-page-view';
import { getSession } from '@/lib/auth-server';
import { metadataForStaticPath } from '@/lib/public-route-metadata';

export const metadata = metadataForStaticPath('/create');

// Sanitize a query-param slug to the same rules the input enforces:
// lowercase, alphanumeric + hyphens. Server-render safe so the
// /create?slug=<value> entry from the landing card V doesn't flash
// empty before client hydration.
function sanitizeSlug(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (session?.user?.id) {
    redirect('/dashboard/appearance');
  }

  const params = await searchParams;
  const initialSlug = sanitizeSlug(params.slug);

  return <CreatePageView initialSlug={initialSlug} />;
}
