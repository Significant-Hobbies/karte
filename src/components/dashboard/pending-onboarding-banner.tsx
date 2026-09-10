'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'karte_pending_onboarding';

interface OnboardingLink {
  title: string;
  url: string;
  body?: string;
}
interface OnboardingProject {
  title: string;
  url: string;
  description: string;
  imageUrl?: string;
}
interface OnboardingState {
  pageId?: string;
  displayName?: string;
  bio?: string;
  slug?: string;
  location?: string;
  calendarUrl?: string;
  newsletterUrl?: string;
  tipUrl?: string;
  videoUrl?: string;
  links?: OnboardingLink[];
  projects?: OnboardingProject[];
}

type Status = 'idle' | 'creating' | 'success' | 'error';

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  return base || 'me';
}

function readPending(): OnboardingState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: OnboardingState };
    if (!parsed?.state || typeof parsed.state !== 'object') return null;
    return parsed.state;
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function savePending(state: OnboardingState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state }));
}

async function importItems<T extends { title: string; url: string }>(
  endpoint: string,
  items: T[],
  checkpoint: (remaining: T[]) => void,
) {
  if (!items.length) return;
  // Reconcile before retrying: a previous request may have committed even
  // when the browser never received its response.
  const response = await fetch(endpoint);
  const existing: unknown = await response.json();
  if (!response.ok || !Array.isArray(existing)) {
    throw new Error(
      'Could not check saved items. Your remaining draft is kept.',
    );
  }
  const remaining = [...items];
  for (const item of items) {
    const saved = existing.some((candidate) =>
      Object.entries(item).every(
        ([key, value]) =>
          (typeof value === 'string' ? value.trim() : (value ?? '')) ===
          (candidate[key] ?? ''),
      ),
    );
    if (!saved) {
      try {
        const result = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (!result.ok) continue;
      } catch {
        continue;
      }
    }
    remaining.splice(remaining.indexOf(item), 1);
    checkpoint([...remaining]);
  }
}

/**
 * Picks up the OnboardingChat handoff and offers a single click to
 * create the page on Karte. Renders only when `?onboarded=1` is on
 * the URL and there's a valid payload in localStorage.
 */
export function PendingOnboardingBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flag = searchParams.get('onboarded') === '1';
  const [pending, setPending] = useState<OnboardingState | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!flag) return;
    setPending(readPending());
  }, [flag]);

  if (!flag || !pending) return null;

  async function handleCreate() {
    if (!pending || status === 'creating') return;
    setStatus('creating');
    setMessage('');
    try {
      const displayName = pending.displayName?.trim() || 'Your name';
      const slug = (pending.slug || slugifyName(displayName)).trim();

      let next = { ...pending };
      // Check storage before making changes, so retry state is durable.
      savePending(next);
      const pageRes = next.pageId
        ? null
        : await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug,
              displayName,
              bio: pending.bio ?? null,
              location: pending.location ?? null,
              calendarUrl: pending.calendarUrl ?? null,
              newsletterUrl: pending.newsletterUrl ?? null,
              tipUrl: pending.tipUrl ?? null,
              videoUrl: pending.videoUrl ?? null,
            }),
          });

      const pageData = (
        pageRes ? await pageRes.json().catch(() => ({})) : { id: next.pageId }
      ) as {
        id?: string;
        error?: string;
      };

      if ((pageRes && !pageRes.ok) || !pageData.id) {
        throw new Error(
          pageData.error || `Page creation failed (${pageRes?.status})`,
        );
      }

      const pageId = pageData.id;
      next = { ...next, pageId };
      setPending(next);
      savePending(next);
      const addedCounts = {
        links: pending.links?.length ?? 0,
        projects: pending.projects?.length ?? 0,
      };

      // Add links one at a time. The endpoint sorts by createdAt order
      // we POST, so iterating preserves user intent.
      await importItems(
        `/api/pages/${pageId}/links`,
        next.links ?? [],
        (links) => {
          next = { ...next, links };
          setPending(next);
          savePending(next);
        },
      );
      await importItems(
        `/api/pages/${pageId}/projects`,
        next.projects ?? [],
        (projects) => {
          next = { ...next, projects };
          setPending(next);
          savePending(next);
        },
      );
      router.refresh();
      const remaining =
        (next.links?.length ?? 0) + (next.projects?.length ?? 0);
      if (remaining) {
        throw new Error(
          `Your draft page is saved. ${remaining} item${remaining === 1 ? '' : 's'} could not be imported. Retry the remaining items; already saved items will be kept.`,
        );
      }

      setStatus('success');
      setMessage(
        `Draft created for karte.cc/${slug}. Added ${addedCounts.links} link${addedCounts.links === 1 ? '' : 's'} and ${addedCounts.projects} project${addedCounts.projects === 1 ? '' : 's'}. Review your page below, turn on Published, and save when you are ready to share it.`,
      );
      try {
        posthog.capture('onboarding_funnel_completed', {
          slug,
          linkCount: addedCounts.links,
          projectCount: addedCounts.projects,
        });
      } catch {
        // ignore
      }
      clearPending();
    } catch (err) {
      setStatus('error');
      setMessage(
        err instanceof Error
          ? err.message
          : 'Could not create your page. Try again from the form below.',
      );
    }
  }

  function handleDismiss() {
    clearPending();
    setPending(null);
  }

  return (
    <section
      className="mb-6 rounded-2xl border border-karte-accent/30 bg-karte-accent/[0.06] p-5"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-karte-accent-soft">
            · From the onboarding chat
          </p>
          <p className="mt-2 text-sm text-karte-text">
            We&apos;ve got{' '}
            <strong className="font-semibold text-karte-text">
              {pending.displayName ?? 'your draft'}
            </strong>{' '}
            {pending.pageId
              ? 'saved as a draft. Retry any remaining imports before publishing.'
              : 'ready to create as a draft. Review it before publishing.'}
          </p>
          {message ? (
            <p
              className={`mt-2 text-xs ${
                status === 'error' ? 'text-rose-300/90' : 'text-karte-text-3'
              }`}
            >
              {message}
            </p>
          ) : null}
          {status === 'error' && pending.pageId ? (
            <details className="mt-3 text-xs text-karte-text-3">
              <summary className="cursor-pointer">
                Remaining draft items
              </summary>
              <ul className="mt-2 space-y-2 break-words">
                {[...(pending.links ?? []), ...(pending.projects ?? [])].map(
                  (item, index) => (
                    <li key={`${item.url}-${index}`}>
                      <strong>{item.title}</strong>: {item.url}
                      {'description' in item ? (
                        <p>{item.description}</p>
                      ) : item.body ? (
                        <p>{item.body}</p>
                      ) : null}
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-2">
                You can also copy these into the editor below. Discarding the
                remaining draft does not remove saved items.
              </p>
            </details>
          ) : null}
        </div>

        {status !== 'success' ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={status === 'creating'}
              className="rounded-full px-4 py-2 text-sm text-karte-text-3 transition hover:text-karte-text"
            >
              {pending.pageId ? 'Discard remaining draft' : 'Dismiss'}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={status === 'creating'}
              className="inline-flex items-center justify-center rounded-full bg-karte-accent px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-karte-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'creating'
                ? 'Saving…'
                : pending.pageId
                  ? 'Retry remaining items'
                  : 'Create my page'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full px-4 py-2 text-sm text-karte-text-3 transition hover:text-karte-text"
          >
            Done
          </button>
        )}
      </div>
    </section>
  );
}
