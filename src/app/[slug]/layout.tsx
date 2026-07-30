import { notFound } from 'next/navigation';

import { getFullPageData } from './_lib/get-page-data';

// Match the page-level cache contract so the layout doesn't drag the
// render tree back into dynamic territory.
export const dynamic = 'force-static';
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export default async function SlugLayout({ params, children }: Props) {
  const { slug } = await params;
  const data = await getFullPageData(slug);
  if (!data) notFound();

  return <div data-karte-public-slug={slug}>{children}</div>;
}
