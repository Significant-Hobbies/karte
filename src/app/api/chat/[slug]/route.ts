import { and, desc, eq } from 'drizzle-orm';

import { db, ensureProjectsTable } from '@/db';
import { conversations, messages, pages, users } from '@/db/schema';
import { generate, getDefaultAiConfig, resolveAiConfig } from '@/lib/ai-client';
import { CHAT_RESPONSE_ENVELOPE_PROMPT } from '@/lib/ai-prompts';
import { resolvePublicProfileSlug } from '@/lib/demo-profiles';
import { search } from '@/lib/knowledgebase';
import { buildProfileMemory } from '@/lib/profile-memory';
import { rateLimit } from '@/lib/rate-limit';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const RECENT_CONTEXT_MESSAGE_LIMIT = 6;
const RECENT_CONTEXT_CHAR_LIMIT = 1200;
const PROFILE_CONTEXT_CHAR_LIMIT = 3600;
const RAG_CONTEXT_CHAR_LIMIT = 1400;
const RAG_TIMEOUT_MS = 150;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const requestedSlug = (await params).slug;
  const slug = resolvePublicProfileSlug(requestedSlug);

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { ok } = await rateLimit(ip);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  let body: {
    query?: unknown;
    visitorEmail?: unknown;
    conversationId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { query, visitorEmail, conversationId } = body;

  if (typeof query !== 'string' || !query.trim()) {
    return new Response(JSON.stringify({ error: 'query required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (query.length > 2000) {
    return new Response(
      JSON.stringify({ error: 'query is too long (max 2000 characters)' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // Get page + user config
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.published, true)));
  if (!page?.chatEnabled) {
    return new Response(JSON.stringify({ error: 'Chat not available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Email gate: chat is a lead-capture surface, so we require a visitor email
  // before letting the AI respond. Accept it either from the request (header
  // or body) or from the conversation row (set on first message). For new
  // conversations with no row yet, the client must include `visitorEmail`.
  await ensureProjectsTable();

  const headerEmail =
    req.headers.get('x-visitor-email')?.trim().toLowerCase() ?? '';
  const bodyEmail =
    typeof visitorEmail === 'string' ? visitorEmail.trim().toLowerCase() : '';
  const providedEmail = bodyEmail || headerEmail;

  let storedEmail: string | null = null;
  // Tracks whether the (already-fetched) conversation row belongs to this
  // page, so the recent-context build below can skip re-fetching the same row.
  let conversationBelongsToPage = false;
  if (typeof conversationId === 'string' && conversationId) {
    const [existing] = await db
      .select({
        visitorEmail: conversations.visitorEmail,
        pageId: conversations.pageId,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    conversationBelongsToPage = Boolean(
      existing && existing.pageId === page.id,
    );
    if (existing && existing.pageId === page.id) {
      storedEmail = existing.visitorEmail ?? null;

      // Lazy-persist email onto an existing conversation that doesn't have one yet
      // (covers conversations created before this feature shipped).
      if (
        !storedEmail &&
        providedEmail &&
        EMAIL_RE.test(providedEmail) &&
        providedEmail.length <= 254
      ) {
        await db
          .update(conversations)
          .set({ visitorEmail: providedEmail })
          .where(eq(conversations.id, conversationId));
        storedEmail = providedEmail;
      }
    }
  }

  const effectiveEmail =
    storedEmail ||
    (providedEmail &&
    EMAIL_RE.test(providedEmail) &&
    providedEmail.length <= 254
      ? providedEmail
      : '');

  if (!effectiveEmail) {
    return new Response(JSON.stringify({ error: 'Email required to chat' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const recentConversationContext =
    conversationBelongsToPage &&
    typeof conversationId === 'string' &&
    conversationId
      ? await buildRecentConversationContext(conversationId)
      : '';
  const directRecall = answerFromRecentConversation(
    query,
    recentConversationContext,
  );
  if (directRecall) {
    return new Response(directRecall, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const directProfileAnswer = answerFromLocalProfile(query, page);
  if (directProfileAnswer) {
    return new Response(directProfileAnswer, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const [user] = await db.select().from(users).where(eq(users.id, page.userId));

  // Public chat is a managed Karte surface. Prefer the fleet provider so a
  // stale profile-specific credential cannot add a failed network hop before
  // every visitor response. Keep the custom config only as a compatibility
  // fallback for self-hosted installs without a managed provider.
  const aiConfig = getDefaultAiConfig() ?? resolveAiConfig(user);
  if (!aiConfig) {
    return new Response(
      JSON.stringify({ error: 'Chat not configured — AI endpoint missing' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const [memory, retrievedContext] = await Promise.all([
      buildProfileMemory({ page, mode: 'chat', query }),
      user.smIndexId && shouldSearchIndexedMemory(query)
        ? searchWithTimeout(user.smIndexId, query, {
            userId: page.userId,
            pageId: page.id,
          })
            .then((searchResults) =>
              searchResults.results.map((r) => r.chunk_content).join('\n\n'),
            )
            .then((context) => clampContext(context, RAG_CONTEXT_CHAR_LIMIT))
            .catch(() => '')
        : Promise.resolve(''),
    ]);

    const directProjectAnswer = answerFromProfileProjects(query, memory);
    if (directProjectAnswer) {
      return new Response(directProjectAnswer, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const baseSystemPrompt =
      page.chatSystemPrompt ||
      `You are a helpful assistant that answers questions about ${page.displayName}.`;

    // Visitor-intent ranking: the page can declare a preferred posture
    // (explore / ask / reach / vibe) in pageSettings.visitorIntent. We
    // translate that into a component-picking hint so the AI surfaces
    // the right kind of help. Default (no hint) keeps the AI free to
    // pick whatever fits.
    const visitorIntent = (
      page.pageSettings as { visitorIntent?: string } | null
    )?.visitorIntent;
    const intentHint = buildIntentHint(visitorIntent);

    const systemPrompt = [
      baseSystemPrompt,
      'Keep the answer tight: usually 1-3 short paragraphs, under 120 words, unless the visitor explicitly asks for depth.',
      'Use the Profile Memory source cards as the primary truth. Do not invent facts, dates, credentials, employers, or personal details that are not present in the sources.',
      'If the sources do not answer the question, say what is missing and suggest contacting the profile owner or using a listed link.',
      `Profile Memory:\n${clampContext(memory.promptContext, PROFILE_CONTEXT_CHAR_LIMIT)}`,
      recentConversationContext
        ? `Recent conversation memory:\n${recentConversationContext}`
        : '',
      recentConversationContext
        ? 'Use recent conversation memory for visitor-provided facts in this room, such as what they just said they are wearing, doing, building, or asking about. Do not claim those facts are in the public profile.'
        : '',
      retrievedContext
        ? `Optional external index matches:\n${retrievedContext}`
        : '',
      CHAT_RESPONSE_ENVELOPE_PROMPT,
      intentHint,
    ]
      .filter(Boolean)
      .join('\n\n');

    // The gateway's streaming compatibility path can complete with an empty
    // 200 response. Use the proven completion path and return its text as one
    // readable chunk; the client already handles both single- and multi-chunk
    // responses through the same stream parser.
    let text = '';
    try {
      text = (
        await generate(aiConfig, {
          system: systemPrompt,
          prompt: query,
          reasoningLevel: 'fast',
          maxOutputTokens: 160,
          timeoutMs: 8000,
        })
      ).trim();
    } catch (error) {
      console.warn(
        'Rich public chat completion failed; retrying compact prompt',
        error,
      );
    }

    if (!text) {
      const fallbackAiConfig = aiConfig;
      try {
        text = (
          await generate(fallbackAiConfig, {
            system: systemPrompt,
            prompt: query,
            reasoningLevel: 'fast',
            maxOutputTokens: 160,
            timeoutMs: 8000,
          })
        ).trim();
      } catch (error) {
        console.warn(
          'Product public chat completion failed; retrying compact prompt',
          error,
        );
      }

      const compactSystemPrompt = [
        `Answer visitor questions about ${page.displayName}.`,
        `Public profile memory: ${clampContext(memory.promptContext, 2400)}`,
        'Use only that public information. If it does not answer the question, say so and suggest contacting the profile owner through a listed public link.',
        'Keep the answer under 80 words.',
      ]
        .filter(Boolean)
        .join('\n\n');

      if (!text) {
        try {
          text = (
            await generate(fallbackAiConfig, {
              system: compactSystemPrompt,
              prompt: query,
              reasoningLevel: 'fast',
              maxOutputTokens: 120,
              timeoutMs: 8000,
            })
          ).trim();
        } catch (error) {
          console.error('Compact public chat completion failed', error);
        }
      }
    }

    if (!text) {
      text = deterministicPublicProfileFallback(page);
    }

    return new Response(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Public chat context build failed', error);
    return new Response(deterministicPublicProfileFallback(page), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

function deterministicPublicProfileFallback(
  page: typeof pages.$inferSelect,
): string {
  const bio = page.bio?.replace(/\s+/g, ' ').trim();
  if (!bio) {
    return `I couldn't generate a tailored answer right now. Please use one of ${page.displayName}'s public contact links.`;
  }

  const summary = bio
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(' ');
  return `I couldn't generate a tailored answer right now. ${page.displayName}: ${clampContext(summary || bio, 420)}`;
}

function answerFromLocalProfile(
  query: string,
  page: typeof pages.$inferSelect,
): string | null {
  const normalizedQuery = query.toLowerCase();
  const firstName = page.displayName.split(/\s+/)[0]?.toLowerCase() ?? '';
  const asksIntro =
    /\bwhat\s+is\s+(this\s+)?profile\s+about\b/.test(normalizedQuery) ||
    /\bwhat\s+(does|do)\s+.+\s+do\b/.test(normalizedQuery) ||
    /\bwho\s+(is|are)\s+/.test(normalizedQuery) ||
    /\btell me about\s+(this profile|this person|him|her|them)\b/.test(
      normalizedQuery,
    ) ||
    (firstName
      ? new RegExp(`\\btell me about\\s+${firstName}\\b`).test(normalizedQuery)
      : false);

  if (!asksIntro || !page.bio) return null;

  const bio = page.bio.replace(/\s+/g, ' ').trim();
  const sentence = bio
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(' ');
  const summary = sentence || bio;
  const clipped =
    summary.length > 360
      ? `${summary
          .slice(0, 357)
          .replace(/\s+\S*$/, '')
          .trim()}...`
      : summary;
  return `${page.displayName}: ${clipped}`;
}

function answerFromProfileProjects(
  query: string,
  memory: Awaited<ReturnType<typeof buildProfileMemory>>,
): string | null {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
  const projectSources = memory.sources.filter(
    (source) => source.type === 'project',
  );
  if (projectSources.length === 0) return null;

  const specificProject = projectSources.find((source) =>
    normalizedQuery.includes(source.title.toLowerCase()),
  );
  if (specificProject?.content) {
    return `${specificProject.title}: ${specificProject.content}`;
  }

  const asksAboutProjects =
    /\b(projects?|products?|building|working on|work on)\b/.test(
      normalizedQuery,
    );
  if (!asksAboutProjects) return null;

  const names = projectSources
    .map((source) => source.title.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (names.length === 0) return null;

  const last = names.pop();
  const formatted =
    names.length === 0 ? last : `${names.join(', ')}, and ${last}`;
  return `${memory.pageName} is building ${formatted}.`;
}

function answerFromRecentConversation(
  query: string,
  context: string,
): string | null {
  if (!context) return null;
  const normalizedQuery = query.toLowerCase();
  const asksWearingColor =
    /\bwhat\b.*\b(colou?r|shirt|t-?shirt|wearing)\b/.test(normalizedQuery) &&
    /\b(colou?r|shirt|t-?shirt|wearing)\b/.test(normalizedQuery);
  const asksWhatVisitorSaid =
    /\bwhat\b.*\b(i|me|my)\b.*\b(said|say|told|tell|mentioned|shared)\b/.test(
      normalizedQuery,
    ) ||
    /\bwhat\b.*\b(did|do)\b.*\b(i|me)\b.*\b(say|tell|mention|share)\b/.test(
      normalizedQuery,
    );

  const visitorLines = context
    .split('\n')
    .filter((line) => line.toLowerCase().startsWith('visitor:'));

  if (asksWhatVisitorSaid) {
    const visitorFact = lastVisitorFact(visitorLines, normalizedQuery);
    if (visitorFact) return `You told me: ${visitorFact}`;
  }

  if (!asksWearingColor) return null;

  const colors = [
    'red',
    'blue',
    'green',
    'yellow',
    'black',
    'white',
    'grey',
    'gray',
    'pink',
    'purple',
    'orange',
    'brown',
    'navy',
    'maroon',
  ];
  for (const line of visitorLines.reverse()) {
    const lower = line.toLowerCase();
    if (!/\bwearing\b/.test(lower) || !/\b(t-?shirt|shirt)\b/.test(lower))
      continue;
    const color = colors.find((candidate) =>
      new RegExp(`\\b${candidate}\\b`).test(lower),
    );
    if (color) {
      const display = color === 'grey' ? 'gray' : color;
      return `You said you're wearing a ${display} t-shirt.`;
    }
  }

  return null;
}

function lastVisitorFact(
  visitorLines: string[],
  normalizedQuery: string,
): string | null {
  const normalizedTopic = normalizedQuery
    .replace(/[^\w\s-]/g, ' ')
    .replace(
      /\b(what|did|do|i|me|my|say|said|tell|told|mention|mentioned|share|shared|you|about)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();

  for (let index = visitorLines.length - 1; index >= 0; index -= 1) {
    const line = visitorLines[index];
    const content = line
      .replace(/^visitor:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!content || content.length > 280 || /[?]/.test(content)) continue;

    const lower = content.toLowerCase();
    if (
      !/\b(i am|i'm|im|my|mine|we are|we're|our|i have|i like|i prefer|i need|i want)\b/.test(
        lower,
      )
    ) {
      continue;
    }

    if (normalizedTopic) {
      const topicWords = normalizedTopic
        .split(' ')
        .filter((word) => word.length >= 3);
      if (
        topicWords.length &&
        !topicWords.some((word) => lower.includes(word))
      ) {
        continue;
      }
    }

    return content;
  }

  return null;
}

function clampContext(value: string, limit: number): string {
  const normalized = value.replace(/\s+\n/g, '\n').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}\n[truncated for live chat speed]`;
}

function shouldSearchIndexedMemory(query: string): boolean {
  const normalized = query.toLowerCase().replace(/\s+/g, ' ').trim();
  return !/^(hi|hello|hey|thanks|thank you|ok|okay|cool|nice|bye|goodbye)[!. ]*$/.test(
    normalized,
  );
}

function searchWithTimeout(
  indexId: string,
  query: string,
  scope: { userId: string; pageId: string },
): ReturnType<typeof search> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);
  return search(indexId, query, 3, scope, 'lexical', controller.signal).finally(
    () => clearTimeout(timeoutId),
  );
}

// Caller has already verified the conversation exists and belongs to the page
// (see `conversationBelongsToPage`), so this only loads the recent messages.
async function buildRecentConversationContext(
  conversationId: string,
): Promise<string> {
  const recent = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(RECENT_CONTEXT_MESSAGE_LIMIT);

  const lines = recent
    .reverse()
    .map((message) => {
      const role = message.role === 'assistant' ? 'Assistant' : 'Visitor';
      const content = message.content.replace(/\s+/g, ' ').trim();
      return content ? `${role}: ${content}` : '';
    })
    .filter(Boolean);

  const context = lines.join('\n');
  if (context.length <= RECENT_CONTEXT_CHAR_LIMIT) return context;
  return context
    .slice(context.length - RECENT_CONTEXT_CHAR_LIMIT)
    .replace(/^[^\n]*\n?/, '')
    .trim();
}

// ── Visitor-intent ranking ──────────────────────────────────────────
// PageSettings.visitorIntent expresses what the owner wants visitors
// to do first. Each intent maps to a soft 'favor these components'
// hint added to the system prompt — never overrides what the visitor
// is actually asking, just nudges the component picks.
function buildIntentHint(intent: string | undefined): string {
  switch (intent) {
    case 'reach':
      return 'VISITOR INTENT: this page wants visitors to reach out. When a visitor question even loosely touches availability, contact, calls, or hiring — strongly favor BookCallSlot + AvailabilityChip + HiringStatus components.';
    case 'explore':
      return "VISITOR INTENT: this page wants visitors to explore the owner's work. Strongly favor TimelineSlice, ProjectMini, MetricCard, and EssayLink when relevant.";
    case 'ask':
      return 'VISITOR INTENT: this page is built for ask-anything chat. Lean into prose answers; use components sparingly — only when they materially help a follow-up action.';
    case 'vibe':
      return 'VISITOR INTENT: this page is curated for vibe / taste. Favor QuoteBlock, EssayLink, LocationCard, and AskAgain that surface personality over transactions.';
    default:
      return '';
  }
}
