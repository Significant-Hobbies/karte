'use client';

import { type FormEvent, useId, useState } from 'react';
import type { DmMode } from '@/db/schema';
import { getAnalyticsLabels } from '@/lib/analytics-labels';
import { authClient } from '@/lib/auth-client';
import { getOrCreateVisitorId } from '@/lib/visitor-id';
import { ContactFormSectionView } from './contact-form-section-view';

type ContactFormSectionProps = {
  slug: string;
  accentColor?: string;
  compact?: boolean;
  sectionId?: string;
  dmMode?: Exclude<DmMode, 'off'>;
  requireVerifiedEmail?: boolean;
};

export function useContactFormSection({
  slug,
  accentColor = '#2563eb',
  compact = false,
  sectionId,
  dmMode = 'email',
  requireVerifiedEmail = false,
}: ContactFormSectionProps) {
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const isAnonymous = dmMode === 'anonymous';
    const usesVerifiedEmail = requireVerifiedEmail && dmMode === 'email';

    if (
      (!isAnonymous && !usesVerifiedEmail && (!trimmedName || !trimmedEmail)) ||
      (usesVerifiedEmail && !session?.user?.email) ||
      !trimmedMessage ||
      !turnstileToken ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setStatus('idle');
    setFeedback('');

    try {
      const res = await fetch(`/api/contact/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isAnonymous
            ? 'Anonymous'
            : usesVerifiedEmail
              ? (session?.user?.name ?? trimmedName)
              : trimmedName,
          email: isAnonymous
            ? ''
            : usesVerifiedEmail
              ? (session?.user?.email ?? trimmedEmail)
              : trimmedEmail,
          message: trimmedMessage,
          visitorId: getOrCreateVisitorId(),
          analyticsLabels: getAnalyticsLabels(),
          sectionId,
          senderType: isAnonymous ? 'anonymous' : 'email',
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      setName('');
      setEmail('');
      setMessage('');
      setStatus('success');
      setFeedback('Message sent. You should hear back soon.');
    } catch (error) {
      setStatus('error');
      setFeedback(
        error instanceof Error ? error.message : 'Failed to send message',
      );
    } finally {
      setTurnstileToken(null);
      setTurnstileResetSignal((current) => current + 1);
      setLoading(false);
    }
  }

  const needsVerifiedSession =
    requireVerifiedEmail && dmMode === 'email' && !session?.user?.email;
  const verifiedIdentity =
    requireVerifiedEmail && dmMode === 'email' && session?.user?.email
      ? session.user.email
      : null;

  return {
    handleSubmit,
    compact,
    needsVerifiedSession,
    isPending,
    dmMode,
    requireVerifiedEmail,
    nameId,
    name,
    setName,
    emailId,
    email,
    setEmail,
    verifiedIdentity,
    messageId,
    message,
    setMessage,
    turnstileResetSignal,
    setTurnstileToken,
    loading,
    turnstileToken,
    accentColor,
    status,
    feedback,
  };
}

export function ContactFormSection(props: ContactFormSectionProps) {
  return <ContactFormSectionView {...useContactFormSection(props)} />;
}
