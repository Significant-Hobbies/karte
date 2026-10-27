'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useRef, useState } from 'react';
import type { DmMode } from '@/db/schema';
import { trackActivated, trackCoreAction } from '@/lib/analytics-events';
import {
  DEFAULT_THEME_PRESET,
  resolveThemeConfig,
  type ThemeConfig,
  type ThemePresetId,
} from '@/lib/themes';
import {
  PageSettingsView,
  PUBLIC_DRAFT_PREVIEW,
  type RemovedSectionPreview,
  type RevampPlan,
  sanitizeSlug,
} from './page-settings-view';

// Mirrors the server-side RevampPlan shape from /api/pages/[id]/revamp.
// Kept inline since the route handler can't export non-handler symbols.
interface PageData {
  id: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  themeConfig?: ThemeConfig | null;
  published: boolean | null;
  dmMode: DmMode;
  location?: string | null;
  calendarUrl?: string | null;
  newsletterUrl?: string | null;
  tipUrl?: string | null;
  videoUrl?: string | null;
  petUrl?: string | null;
  petEnabled?: boolean | null;
}

interface PageSettingsProps {
  page: PageData | null;
  requireAuthToCreate?: boolean;
  loginHref?: string;
  // Pre-filled slug for new pages — e.g. ?slug=foo from the landing
  // card V claim form. Ignored when `page` is set (editing existing).
  initialSlug?: string;
}

const PAGE_DRAFT_STORAGE_KEY = 'karte:page-draft';
function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'K'
  );
}

export function usePageSettings({
  page,
  requireAuthToCreate = false,
  loginHref = '/login?next=/dashboard/appearance',
  initialSlug = '',
}: PageSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = !!page;
  const shouldClaimOnLogin = !page && requireAuthToCreate;
  const draftLoadedRef = useRef(false);

  // Slug can arrive pre-filled either from a server prop (preferred —
  // /create reads ?slug= server-side so the initial render has the
  // value baked in) or from the client search params as a fallback.
  // For new (no `page`) flows only.
  const initialSlugFromQuery = !page
    ? sanitizeSlug(initialSlug || searchParams.get('slug') || '')
    : '';

  const identity = initialIdentity(page, initialSlugFromQuery);
  const [slug, setSlug] = useState(identity.slug);
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [bio, setBio] = useState(identity.bio);
  const [avatarUrl, setAvatarUrl] = useState(identity.avatarUrl);
  const [themePresetId, setThemePresetId] = useState<ThemePresetId>(
    (page?.themeConfig?.presetId as ThemePresetId | undefined) ??
      DEFAULT_THEME_PRESET.id,
  );
  const [published, setPublished] = useState(page?.published ?? false);
  const [dmMode, setDmMode] = useState<DmMode>(page?.dmMode ?? 'off');
  const [location, setLocation] = useState(page?.location ?? '');
  const [calendarUrl, setCalendarUrl] = useState(page?.calendarUrl ?? '');
  const [newsletterUrl, setNewsletterUrl] = useState(page?.newsletterUrl ?? '');
  const [tipUrl, setTipUrl] = useState(page?.tipUrl ?? '');
  const [videoUrl, setVideoUrl] = useState(page?.videoUrl ?? '');
  const [petUrl, setPetUrl] = useState(page?.petUrl ?? '');
  const [petEnabled, setPetEnabled] = useState(page?.petEnabled ?? true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiRunning, setAiRunning] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  // Two-step revamp flow: previewAiTheme generates a plan without
  // mutating; applyPendingPlan commits the previewed plan. Lets the
  // user inspect (and discard) before any DB write or theme swap.
  const [pendingPlan, setPendingPlan] = useState<RevampPlan | null>(null);
  const [pendingRemovals, setPendingRemovals] = useState<
    RemovedSectionPreview[]
  >([]);
  // Bumped on every successful save to force the live-preview iframe to
  // reload with fresh content. Cheap way to keep the preview honest
  // without manually wiring a postMessage channel.
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  async function previewAiTheme() {
    if (!page || !aiPrompt.trim()) {
      setAiMessage('Describe the vibe you want first.');
      return;
    }
    setAiRunning(true);
    setAiMessage('');
    setPendingPlan(null);
    setPendingRemovals([]);
    try {
      const res = await fetch(`/api/pages/${page.id}/revamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, apply: false }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        plan?: RevampPlan;
        removedSections?: RemovedSectionPreview[];
      };
      if (!res.ok || !data.plan) {
        throw new Error(data.error || 'Failed to generate theme');
      }
      setPendingPlan(data.plan);
      setPendingRemovals(data.removedSections ?? []);
      setAiMessage(
        'Preview ready — review below, then Apply when you are happy.',
      );
    } catch (error) {
      setAiMessage(
        error instanceof Error ? error.message : 'Failed to generate theme',
      );
    } finally {
      setAiRunning(false);
    }
  }

  async function applyPendingPlan() {
    if (!page || !pendingPlan) return;
    setAiRunning(true);
    setAiMessage('');
    try {
      // Send the cached plan back so the server skips the AI call and
      // just commits — no second LLM round-trip.
      const res = await fetch(`/api/pages/${page.id}/revamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: pendingPlan, apply: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        plan?: RevampPlan;
      };
      if (!res.ok) throw new Error(data.error || 'Failed to apply theme');
      const nextPresetId =
        data?.plan?.themePresetId ?? pendingPlan.themePresetId;
      if (typeof nextPresetId === 'string') {
        setThemePresetId(nextPresetId as ThemePresetId);
      }
      setAiMessage('Theme applied.');
      setPendingPlan(null);
      setPendingRemovals([]);
      setAiPrompt('');
      setPreviewRefreshKey((n) => n + 1);
      router.refresh();
    } catch (error) {
      setAiMessage(
        error instanceof Error ? error.message : 'Failed to apply theme',
      );
    } finally {
      setAiRunning(false);
    }
  }

  function discardPendingPlan() {
    setPendingPlan(null);
    setPendingRemovals([]);
    setAiMessage('');
  }
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');
  const isErrorMessage = /required|failed|taken|invalid|unauthorized/i.test(
    message,
  );
  const previewTheme = resolveThemeConfig({ presetId: themePresetId });
  const previewDisplayName = displayName.trim() || PUBLIC_DRAFT_PREVIEW.name;
  const previewBio = bio.trim() || PUBLIC_DRAFT_PREVIEW.bio;
  const previewSlug = slug.trim() || PUBLIC_DRAFT_PREVIEW.slug;
  const previewInitials = getInitials(previewDisplayName);

  useEffect(() => {
    if (typeof window === 'undefined' || draftLoadedRef.current) {
      return;
    }

    draftLoadedRef.current = true;

    if (page) {
      window.localStorage.removeItem(PAGE_DRAFT_STORAGE_KEY);
      return;
    }

    const storedDraft = window.localStorage.getItem(PAGE_DRAFT_STORAGE_KEY);
    if (!storedDraft) {
      return;
    }

    try {
      const draft = JSON.parse(storedDraft) as {
        slug?: string;
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
        themePresetId?: ThemePresetId;
      };

      // Don't overwrite a slug that came in via ?slug= — the URL is
      // the most recent intent and overrides any older draft.
      if (typeof draft.slug === 'string' && !initialSlugFromQuery) {
        setSlug(draft.slug);
      }
      if (typeof draft.displayName === 'string') {
        setDisplayName(draft.displayName);
      }
      if (typeof draft.bio === 'string') {
        setBio(draft.bio);
      }
      if (typeof draft.avatarUrl === 'string') {
        setAvatarUrl(draft.avatarUrl);
      }
      if (typeof draft.themePresetId === 'string') {
        setThemePresetId(draft.themePresetId);
      }

      setMessage('Draft restored. Sign in to claim your username and save it.');
    } catch {
      window.localStorage.removeItem(PAGE_DRAFT_STORAGE_KEY);
    }
  }, [page]);

  function persistDraft() {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      PAGE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        slug,
        displayName,
        bio,
        avatarUrl,
        themePresetId,
      }),
    );
  }

  async function handleSave() {
    if (!slug || !displayName) {
      setMessage('Slug and display name are required');
      return;
    }

    if (shouldClaimOnLogin) {
      persistDraft();
      setMessage('Redirecting to sign in so you can claim this username.');
      router.push(loginHref);
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const url = isEditing ? `/api/pages/${page.id}` : '/api/pages';
      const method = isEditing ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        slug,
        displayName,
        bio,
        avatarUrl,
        themeConfig: { presetId: themePresetId },
        dmMode,
        location: location.trim() || null,
        calendarUrl: calendarUrl.trim() || null,
        newsletterUrl: newsletterUrl.trim() || null,
        tipUrl: tipUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        petUrl: petUrl.trim() || null,
        petEnabled,
      };
      if (isEditing) {
        body.published = published;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || 'Failed to save');
        return;
      }

      if (!isEditing) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(PAGE_DRAFT_STORAGE_KEY);
        }
        posthog.capture('page_created', {
          slug,
          theme: themePresetId,
        });
        setMessage('Page created successfully');
        router.refresh();
      } else {
        // Owner-facing analytics — a profile going live is the core action,
        // and the first publish is the activation milestone.
        if (published && !page.published) {
          trackCoreAction('page_published');
          trackActivated();
        }
        setMessage('Saved successfully');
        setPreviewRefreshKey((n) => n + 1);
      }
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return {
    handleSave,
    isEditing,
    shouldClaimOnLogin,
    aiPrompt,
    setAiPrompt,
    aiRunning,
    pendingPlan,
    previewAiTheme,
    aiMessage,
    pendingRemovals,
    applyPendingPlan,
    discardPendingPlan,
    page,
    previewRefreshKey,
    previewTheme,
    avatarUrl,
    previewInitials,
    previewSlug,
    previewDisplayName,
    previewBio,
    slug,
    setSlug,
    displayName,
    setDisplayName,
    bio,
    setBio,
    setAvatarUrl,
    setUploadingAvatar,
    themePresetId,
    setThemePresetId,
    dmMode,
    setDmMode,
    location,
    setLocation,
    calendarUrl,
    setCalendarUrl,
    newsletterUrl,
    setNewsletterUrl,
    tipUrl,
    setTipUrl,
    videoUrl,
    setVideoUrl,
    petEnabled,
    setPetEnabled,
    petUrl,
    setPetUrl,
    published,
    setPublished,
    saving,
    uploadingAvatar,
    message,
    isErrorMessage,
  };
}

export function PageSettings(props: PageSettingsProps) {
  return <PageSettingsView {...usePageSettings(props)} />;
}

function initialIdentity(page: PageData | null, initialSlug: string) {
  return {
    slug: page?.slug ?? initialSlug,
    displayName: page?.displayName ?? '',
    bio: page?.bio ?? '',
    avatarUrl: page?.avatarUrl ?? '',
  };
}
