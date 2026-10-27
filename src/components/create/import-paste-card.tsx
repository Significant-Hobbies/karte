'use client';

import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useState } from 'react';
import type { ImportedLinkItem } from '@/components/create/imported-link-preview';
import { hostnameFromUrl } from '@/lib/hostname';
import { ImportPasteCardView } from './import-paste-card-view';

const PENDING_IMPORT_STORAGE_KEY = 'karte_pending_import';

interface PendingImportPayload {
  sourceUrl: string;
  links: ImportedLinkItem[];
  importedAt: string;
}

function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function normalizeSubmittedUrl(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function useImportPasteCard() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [importedLinks, setImportedLinks] = useState<ImportedLinkItem[]>([]);
  const [normalizedSource, setNormalizedSource] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    setErrorMessage('');
    setImportedLinks([]);
    setNormalizedSource(null);

    if (!isLikelyUrl(sourceUrl)) {
      setErrorMessage('Enter a valid URL — e.g. https://linktr.ee/yourname.');
      return;
    }

    const normalized = normalizeSubmittedUrl(sourceUrl);

    try {
      posthog.capture('import_preview_submitted', {
        sourceHost: hostnameFromUrl(normalized),
      });
    } catch {
      // Never break a user flow on analytics.
    }

    setLoading(true);
    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: normalized }),
      });

      let data: { links?: ImportedLinkItem[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // ignore — handled below
      }

      if (res.status === 429) {
        setErrorMessage('Too many tries — wait a minute and retry.');
        return;
      }

      if (!res.ok) {
        setErrorMessage(
          data.error ||
            (res.status >= 500
              ? 'We couldn’t reach that page. Try a different URL.'
              : 'That URL didn’t look importable. Try a Linktree, Beacons, Bio.link or Carrd link.'),
        );
        return;
      }

      const nextLinks = Array.isArray(data.links)
        ? data.links.filter(
            (item): item is ImportedLinkItem =>
              !!item &&
              typeof item.title === 'string' &&
              typeof item.url === 'string',
          )
        : [];

      if (nextLinks.length === 0) {
        setErrorMessage(
          'We didn’t find any links on that page. Try a Linktree, Beacons, Bio.link or Carrd URL.',
        );
        return;
      }

      setImportedLinks(nextLinks);
      setNormalizedSource(normalized);

      try {
        posthog.capture('import_preview_rendered', {
          sourceHost: hostnameFromUrl(normalized),
          linkCount: nextLinks.length,
        });
      } catch {
        // ignore
      }
    } catch {
      setErrorMessage(
        'Couldn’t reach the import service. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClaim() {
    if (importedLinks.length === 0 || !normalizedSource) return;

    const payload: PendingImportPayload = {
      sourceUrl: normalizedSource,
      links: importedLinks,
      importedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(
        PENDING_IMPORT_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      setErrorMessage(
        'Your imported links could not be saved in this browser. Enable site storage or free some space, then try claiming again. Keep this page open to preserve your links.',
      );
      return;
    }

    try {
      posthog.capture('import_funnel_signup_clicked', {
        sourceHost: hostnameFromUrl(normalizedSource),
        linkCount: importedLinks.length,
      });
    } catch {
      // ignore
    }

    router.push('/login?next=/welcome');
  }

  return {
    handleSubmit,
    sourceUrl,
    setSourceUrl,
    loading,
    errorMessage,
    importedLinks,
    normalizedSource,
    handleClaim,
  };
}

export function ImportPasteCard() {
  return <ImportPasteCardView {...useImportPasteCard()} />;
}
