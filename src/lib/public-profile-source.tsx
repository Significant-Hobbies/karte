import Link from 'next/link';
import { createElement, type ReactNode } from 'react';
import {
  AgentCapabilitiesSection,
  AgentProfileBanner,
} from '@/components/public/agent-profile-chrome';
import { AnimatedReveal } from '@/components/public/animated-reveal';
import { ContactFormSection } from '@/components/public/contact-form-section';
import { ContactFormSectionView } from '@/components/public/contact-form-section-view';
import { GlassCard } from '@/components/public/glass-card';
import { LayoutRenderer } from '@/components/public/layout-renderer';
import { OpenChatButton } from '@/components/public/open-chat-button';
import { PageSectionRenderer } from '@/components/public/page-section-renderer';
import { ProfileActionIcon } from '@/components/public/profile-action-icon';
import { ProfileAvatar } from '@/components/public/profile-avatar';
import {
  ChatWidget,
  ProfileContent,
} from '@/components/public/profile-content';
import { ProfileHero } from '@/components/public/profile-hero';
import { ProfileHeroView } from '@/components/public/profile-hero-view';
import { RoamingCharacter } from '@/components/public/roaming-character';
import { SafeImage } from '@/components/public/safe-image';
import {
  DomainIconFallback,
  SocialIconRow,
} from '@/components/public/social-icon-row';
import { TimelineSection } from '@/components/public/timeline-section';
import { TrackableSection } from '@/components/public/trackable-section';
import { TurnstileWidget } from '@/components/public/turnstile-widget';
import { TypedText } from '@/components/public/typed-text';
import { VideoEmbed } from '@/components/public/video-embed';
import { HostIcon } from '@/components/public/widgets/link-card-variants';
import { reactSourceMarkdown } from './react-source-markdown';

const noop = () => {};
type Props = Record<string, unknown> & { children?: ReactNode };
const adapters = new Map<unknown, (props: Props) => ReactNode>([
  [Link, (props) => createElement('a', { href: props.href }, props.children)],
  [
    ProfileHero,
    (props) =>
      createElement(
        ProfileHeroView,
        props as Parameters<typeof ProfileHeroView>[0],
      ),
  ],
  [TrackableSection, (props) => createElement('div', null, props.children)],
  [OpenChatButton, (props) => createElement('button', null, props.children)],
  [TypedText, (props) => String(props.text ?? '')],
  [
    SafeImage,
    (props) =>
      props.src
        ? createElement('img', { src: props.src, alt: props.alt })
        : (props.fallback as ReactNode),
  ],
  [
    ProfileAvatar,
    (props) =>
      props.src
        ? createElement('img', { src: props.src, alt: props.alt })
        : String(props.initials ?? ''),
  ],
  [ChatWidget, () => null],
  [RoamingCharacter, () => null],
  [TurnstileWidget, () => null],
  [
    ContactFormSection,
    (props) =>
      createElement(ContactFormSectionView, {
        handleSubmit: async () => {},
        compact: Boolean(props.compact),
        needsVerifiedSession: Boolean(
          props.requireVerifiedEmail && props.dmMode === 'email',
        ),
        isPending: false,
        dmMode: props.dmMode === 'anonymous' ? 'anonymous' : 'email',
        requireVerifiedEmail: Boolean(props.requireVerifiedEmail),
        nameId: 'name',
        name: '',
        setName: noop,
        emailId: 'email',
        email: '',
        setEmail: noop,
        verifiedIdentity: null,
        messageId: 'message',
        message: '',
        setMessage: noop,
        turnstileResetSignal: 0,
        setTurnstileToken: noop,
        loading: false,
        turnstileToken: null,
        accentColor: String(props.accentColor ?? '#2563eb'),
        status: 'idle',
        feedback: '',
      }),
  ],
]);

export function publicProfileMarkdown(
  slug: string,
  data: Parameters<typeof ProfileContent>[0]['data'],
) {
  const body = reactSourceMarkdown(
    createElement(ProfileContent, { slug, data }),
    {
      origin: 'https://karte.cc',
      components: [
        ProfileContent,
        ProfileHeroView,
        ProfileActionIcon,
        SocialIconRow,
        DomainIconFallback,
        AgentCapabilitiesSection,
        AgentProfileBanner,
        AnimatedReveal,
        LayoutRenderer,
        PageSectionRenderer,
        TimelineSection,
        VideoEmbed,
        GlassCard,
        HostIcon,
        ContactFormSectionView,
      ],
      adapters,
    },
  );
  return `${body}\n\n> Source: https://karte.cc/${slug}\n`;
}
