import { and, asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { loadOwnedPage, requireUser } from '@/lib/api-auth';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ pageId: string; conversationId: string }> },
) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { pageId, conversationId } = await params;
  const page = await loadOwnedPage(pageId, auth.userId);
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // The existing messages foreign key cascades within this single statement.
  const deleted = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.pageId, pageId),
      ),
    )
    .returning({ id: conversations.id });
  if (deleted.length === 0) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }
  return new Response(null, { status: 204 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string; conversationId: string }> },
) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;

  const { pageId, conversationId } = await params;

  // Verify ownership
  const page = await loadOwnedPage(pageId, auth.userId);

  if (!page) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Verify conversation belongs to page
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.pageId, pageId),
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
