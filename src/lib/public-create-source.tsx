import { createElement } from 'react';
import { CreatePageView } from '@/components/create/create-page-view';
import { ImportPasteCard } from '@/components/create/import-paste-card';
import { ImportPasteCardView } from '@/components/create/import-paste-card-view';
import { OnboardingChat } from '@/components/create/onboarding-chat';
import { OnboardingChatView } from '@/components/create/onboarding-chat-view';
import { ImageUploadField } from '@/components/dashboard/image-upload-field';
import { ImageUploadFieldView } from '@/components/dashboard/image-upload-field-view';
import { PageSettings } from '@/components/dashboard/page-settings';
import {
  PageSettingsView,
  PUBLIC_DRAFT_PREVIEW,
} from '@/components/dashboard/page-settings-view';
import { PublicTopBar } from '@/components/public/public-top-bar';
import { reactSourceMarkdown } from './react-source-markdown';
import { DEFAULT_THEME_PRESET, resolveThemeConfig } from './themes';

const noop = () => {};
const asyncNoop = async () => {};
const blankSettings: Parameters<typeof PageSettingsView>[0] = {
  isEditing: false,
  shouldClaimOnLogin: true,
  page: null,
  slug: '',
  displayName: '',
  bio: '',
  avatarUrl: '',
  themePresetId: DEFAULT_THEME_PRESET.id,
  previewTheme: resolveThemeConfig({ presetId: DEFAULT_THEME_PRESET.id }),
  previewDisplayName: PUBLIC_DRAFT_PREVIEW.name,
  previewBio: PUBLIC_DRAFT_PREVIEW.bio,
  previewSlug: PUBLIC_DRAFT_PREVIEW.slug,
  previewInitials: 'YN',
  aiPrompt: '',
  aiRunning: false,
  aiMessage: '',
  pendingPlan: null,
  pendingRemovals: [],
  previewRefreshKey: 0,
  dmMode: 'off',
  location: '',
  calendarUrl: '',
  newsletterUrl: '',
  tipUrl: '',
  videoUrl: '',
  petUrl: '',
  petEnabled: true,
  published: false,
  saving: false,
  uploadingAvatar: false,
  message: '',
  isErrorMessage: false,
  setAiPrompt: noop,
  previewAiTheme: asyncNoop,
  applyPendingPlan: asyncNoop,
  discardPendingPlan: noop,
  setSlug: noop,
  setDisplayName: noop,
  setBio: noop,
  setAvatarUrl: noop,
  setUploadingAvatar: noop,
  setThemePresetId: noop,
  setDmMode: noop,
  setLocation: noop,
  setCalendarUrl: noop,
  setNewsletterUrl: noop,
  setTipUrl: noop,
  setVideoUrl: noop,
  setPetEnabled: noop,
  setPetUrl: noop,
  setPublished: noop,
  handleSave: asyncNoop,
};

// A fresh anonymous form only: never load browser drafts, sessions, import results,
// chat transcripts, query strings, or invoke the interactive components' hooks.
export function publicCreateMarkdown() {
  const adapters = new Map<
    unknown,
    (props: Record<string, unknown>) => React.ReactNode
  >([
    [PublicTopBar, () => null],
    [PageSettings, () => createElement(PageSettingsView, blankSettings)],
    [
      ImageUploadField,
      (props) =>
        createElement(ImageUploadFieldView, {
          inputId: 'public-avatar',
          label: String(props.label),
          preview: '',
          kind: 'avatar',
          canUpload: false,
          uploading: false,
          fileInputRef: { current: null },
          onChange: noop,
          setMessage: noop,
          handleFileSelect: asyncNoop,
          value: '',
          messageType: 'success',
          placeholder: String(props.placeholder),
          helpText: String(props.helpText),
          message: '',
        }),
    ],
    [
      ImportPasteCard,
      () =>
        createElement(ImportPasteCardView, {
          handleSubmit: asyncNoop,
          sourceUrl: '',
          setSourceUrl: noop,
          loading: false,
          errorMessage: '',
          importedLinks: [],
          normalizedSource: null,
          handleClaim: noop,
        }),
    ],
    [
      OnboardingChat,
      () =>
        createElement(OnboardingChatView, {
          scrollRef: { current: null },
          messages: [],
          loading: false,
          error: '',
          handleSubmit: asyncNoop,
          draft: '',
          setDraft: noop,
          done: false,
          summary: [],
          handleClaim: noop,
        }),
    ],
  ]);
  return `${reactSourceMarkdown(createElement('main', null, createElement(CreatePageView, { initialSlug: '' })), { origin: 'https://karte.cc', components: [CreatePageView, PageSettingsView, ImageUploadFieldView, ImportPasteCardView, OnboardingChatView], adapters })}\n\n> Source: https://karte.cc/create\n`;
}
