'use client';

import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useRef, useState } from 'react';
import { hostnameFromUrl } from '@/lib/hostname';
import { OnboardingChatView } from './onboarding-chat-view';

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ServerReply {
  reply: string;
  state: OnboardingState;
  done: boolean;
  error?: string;
}

function fieldSummary(state: OnboardingState): string[] {
  const lines: string[] = [];
  if (state.displayName) lines.push(`Name: ${state.displayName}`);
  if (state.bio) lines.push(`Bio: ${state.bio}`);
  if (state.location) lines.push(`Location: ${state.location}`);
  if (state.slug) lines.push(`URL: karte.cc/${state.slug}`);
  if (state.calendarUrl)
    lines.push(
      `Booking: ${hostnameFromUrl(state.calendarUrl, state.calendarUrl)}`,
    );
  if (state.newsletterUrl)
    lines.push(
      `Newsletter: ${hostnameFromUrl(state.newsletterUrl, state.newsletterUrl)}`,
    );
  if (state.tipUrl)
    lines.push(`Tip jar: ${hostnameFromUrl(state.tipUrl, state.tipUrl)}`);
  if (state.videoUrl)
    lines.push(`Video: ${hostnameFromUrl(state.videoUrl, state.videoUrl)}`);
  if (state.links?.length) lines.push(`Links: ${state.links.length}`);
  if (state.projects?.length) lines.push(`Projects: ${state.projects.length}`);
  return lines;
}

export function useOnboardingChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<OnboardingState>({});
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // First-load greeting — fetch the opener so we don't hardcode it.
  useEffect(() => {
    if (messages.length !== 0) return;
    void send([], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(history: ChatMessage[], isGreeting = false) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, state }),
      });
      const data = (await res.json().catch(() => ({}))) as ServerReply;
      if (!res.ok || data.error) {
        if (res.status === 429) {
          setError('Too many messages — slow down a moment.');
        } else if (res.status === 503) {
          setError(
            'Onboarding bot is offline right now. Use the import or scratch flow below.',
          );
        } else {
          setError(data.error || 'Something went wrong. Try again.');
        }
        return;
      }
      setState(data.state);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
      if (data.done) {
        setDone(true);
        try {
          posthog.capture('onboarding_chat_done', {
            hasName: !!data.state.displayName,
            linkCount: data.state.links?.length ?? 0,
            projectCount: data.state.projects?.length ?? 0,
          });
        } catch {
          // analytics never breaks the funnel
        }
      } else if (isGreeting) {
        try {
          posthog.capture('onboarding_chat_started');
        } catch {
          // ignore
        }
      }
    } catch {
      setError('Network blip. Try again?');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !draft.trim() || done) return;
    const userMsg: ChatMessage = { role: 'user', content: draft.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft('');
    await send(next);
  }

  function handleClaim() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state, capturedAt: new Date().toISOString() }),
      );
    } catch {
      setError(
        'Your draft could not be saved in this browser. Enable site storage or free some space, then try claiming again. Keep this page open to preserve your draft.',
      );
      return;
    }
    try {
      posthog.capture('onboarding_funnel_signup_clicked', {
        linkCount: state.links?.length ?? 0,
        projectCount: state.projects?.length ?? 0,
      });
    } catch {
      // ignore
    }
    router.push('/login?next=/dashboard/appearance&onboarded=1');
  }

  const summary = fieldSummary(state);

  return {
    scrollRef,
    messages,
    loading,
    error,
    handleSubmit,
    draft,
    setDraft,
    done,
    summary,
    handleClaim,
  };
}

export function OnboardingChat() {
  return <OnboardingChatView {...useOnboardingChat()} />;
}
