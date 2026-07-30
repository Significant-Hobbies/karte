import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { conversations, messages, pages } from '@/db/schema';
import { resolvePublicProfileSlug } from '@/lib/demo-profiles';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const requestedSlug = (await params).slug;
  const slug = resolvePublicProfileSlug(requestedSlug);
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const { ok } = await rateLimit(`chat-message-write:${slug}:${ip}`, {
    maxRequests: 40,
    windowMs: 60_000,
    endpoint: 'chat-message-write',
  });
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const body = await req.json();
  const { conversationId, role, content } = body;

  if (!conversationId || !role || !content) {
    return NextResponse.json(
      { error: 'conversationId, role, and content are required' },
      { status: 400 },
    );
  }

  if (!['user', 'assistant'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Validate conversationId belongs to the page slug
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.published, true)));

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.pageId, page.id),
      ),
    );

  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }

  const [message] = await db
    .insert(messages)
    .values({ conversationId, role, content })
    .returning();

  return NextResponse.json(message, { status: 201 });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const requestedSlug = (await params).slug;
  const slug = resolvePublicProfileSlug(requestedSlug);
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const { ok } = await rateLimit(`chat-message-read:${slug}:${ip}`, {
    maxRequests: 60,
    windowMs: 60_000,
    endpoint: 'chat-message-read',
  });
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId query param required' },
      { status: 400 },
    );
  }

  // Validate page
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.published, true)));

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // Validate conversation belongs to page
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.pageId, page.id),
      ),
    );

  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(msgs);
}
