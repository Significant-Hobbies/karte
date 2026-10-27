import { type NextRequest, NextResponse } from 'next/server';
import { markdownResponse } from '@/lib/agent-surfaces/http.mjs';
import { renderPublicRouteMarkdown } from '@/lib/public-route-markdown';
import {
  parsePublicHtmlPath,
  SITE_ORIGIN,
} from '../../../../../public-route-contract.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path?.startsWith('/')) {
    return NextResponse.json(
      { error: 'A public path is required.' },
      { status: 400 },
    );
  }

  const markdown = await renderPublicRouteMarkdown(path);
  if (!markdown) {
    return new NextResponse('# Not found\n', {
      status: 404,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, follow',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return markdownResponse(markdown, request, {
    'Cache-Control': 'private, no-store',
    'Content-Location': new URL(
      parsePublicHtmlPath(path)?.path ?? path,
      SITE_ORIGIN,
    ).href,
  });
}
