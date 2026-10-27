import { FormField, Input, Toggle } from '@/components/ui';
import type { DmMode } from '@/db/schema';
import { THEME_PRESETS } from '@/lib/themes';
import { ImageUploadField } from './image-upload-field';
import type { usePageSettings } from './page-settings';
import { ProfilePreview } from './profile-preview';

export interface RevampPlan {
  themePresetId: string;
  customColors?: {
    gradientFrom: string;
    gradientTo: string;
    accentColor: string;
  };
  headline: string;
  rationale: string;
  emphasis: string[];
  blocks: Array<{
    type: string;
    title: string;
    content: string;
    buttonLabel?: string | null;
    buttonUrl?: string | null;
  }>;
  removeSectionIds: string[];
}

export interface RemovedSectionPreview {
  id: string;
  title: string;
  type: string;
}

const DM_MODE_OPTIONS: Array<{
  value: DmMode;
  label: string;
  description: string;
}> = [
  {
    value: 'off',
    label: 'Off',
    description: 'Hide the public DM button.',
  },
  {
    value: 'anonymous',
    label: 'Anonymous',
    description: 'Visitors can send a message without sharing identity.',
  },
  {
    value: 'email',
    label: 'Email-verified',
    description: 'Visitors must be signed in with a verified email.',
  },
];

export function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-');
}

export const PUBLIC_DRAFT_PREVIEW = {
  name: 'Your Name',
  bio: 'A short bio will show visitors what you are about.',
  slug: 'your-name',
};

export function PageSettingsView(view: ReturnType<typeof usePageSettings>) {
  'use no memo';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-karte-text">
        {view.isEditing
          ? 'Appearance'
          : view.shouldClaimOnLogin
            ? 'Build Your Profile'
            : 'Create Your Page'}
      </h1>

      {view.isEditing && (
        <div className="mb-6 rounded-2xl border border-karte-accent/25 bg-gradient-to-br from-karte-accent/[0.10] via-karte-accent/[0.04] to-transparent p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-karte-accent-soft">
            <span className="text-karte-accent/80">·</span> Prompt the design
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-karte-text">
            Describe the vibe — we&apos;ll style your page
          </h2>
          <p className="mt-1.5 text-[12px] leading-[1.55] text-karte-text-3">
            Picks a theme preset and tweaks colors to match. Variant / layout
            generation (which widgets the AI picks for each link or project) is
            on the roadmap.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={view.aiPrompt}
              onChange={(e) => view.setAiPrompt(e.target.value)}
              placeholder="e.g. dark editorial with warm gold accents"
              disabled={view.aiRunning || !!view.pendingPlan}
              className="min-w-0 flex-1 rounded-xl bg-white/[0.045] px-4 py-2.5 text-[14px] text-karte-text placeholder:text-karte-text-4 outline-none ring-1 ring-inset ring-transparent transition-all duration-200 ease-[var(--karte-ease)] hover:bg-white/[0.06] focus:bg-white/[0.06] focus:ring-karte-accent/35 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={view.previewAiTheme}
              disabled={
                view.aiRunning || !view.aiPrompt.trim() || !!view.pendingPlan
              }
              className="shrink-0 rounded-xl bg-karte-accent px-5 py-2.5 text-[14px] font-semibold text-zinc-950 transition hover:bg-karte-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {view.aiRunning && !view.pendingPlan ? 'Generating…' : 'Preview'}
            </button>
          </div>
          {view.aiMessage && (
            <p
              className={`mt-2 text-[12px] ${view.aiMessage.toLowerCase().includes('failed') ? 'text-rose-300/90' : 'text-karte-text-3'}`}
            >
              {view.aiMessage}
            </p>
          )}

          {view.pendingPlan && (
            <RevampPreview
              plan={view.pendingPlan}
              removals={view.pendingRemovals}
              applying={view.aiRunning}
              onApply={view.applyPendingPlan}
              onDiscard={view.discardPendingPlan}
            />
          )}
        </div>
      )}

      {view.isEditing && view.page ? (
        <ProfilePreview
          slug={view.page.slug}
          refreshKey={view.previewRefreshKey}
        />
      ) : (
        <div className="rounded-2xl bg-white/[0.02] p-6">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-karte-text">
                Live preview
              </p>
              <p className="text-xs text-karte-text-4">
                Sketch of how your page will look. The real page appears here
                once you claim it.
              </p>
            </div>
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em]"
              style={{
                borderColor: `${view.previewTheme.accentColor}40`,
                color: view.previewTheme.accentColor,
              }}
            >
              {view.previewTheme.label}
            </span>
          </div>

          <div
            className="rounded-[28px] p-[1px]"
            style={{
              background: `linear-gradient(135deg, ${view.previewTheme.accentColor}66, ${view.previewTheme.gradientFrom}26)`,
            }}
          >
            <div
              className="relative overflow-hidden rounded-[27px] border border-karte-border-strong bg-karte-bg p-5 sm:p-8"
              style={{
                background: `linear-gradient(180deg, ${view.previewTheme.gradientFrom}1a 0%, ${view.previewTheme.gradientTo}1a 40%, var(--karte-bg) 100%)`,
              }}
            >
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                {view.avatarUrl.trim() ? (
                  <div
                    className="h-20 w-20 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${view.avatarUrl.trim()})` }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-karte-text"
                    style={{
                      background: `linear-gradient(135deg, ${view.previewTheme.gradientFrom}, ${view.previewTheme.gradientTo})`,
                    }}
                  >
                    {view.previewInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-medium uppercase tracking-[0.32em]"
                    style={{ color: view.previewTheme.accentColor }}
                  >
                    karte.cc/{view.previewSlug}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-karte-text sm:text-3xl">
                    {view.previewDisplayName}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                    {view.previewBio}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 rounded-2xl bg-white/[0.02] p-6">
        {/* Slug */}
        <div>
          <label
            htmlFor="slug"
            className="mb-2 block text-sm font-medium text-karte-text"
          >
            Page URL
          </label>
          <div className="flex items-center rounded-lg border border-karte-border-emphasis bg-white/5 backdrop-blur-sm transition focus-within:border-white/40 focus-within:ring-1 focus-within:ring-white/20">
            <span className="pl-4 text-sm text-karte-text-3">karte.cc/</span>
            <input
              id="slug"
              type="text"
              value={view.slug}
              onChange={(e) => view.setSlug(sanitizeSlug(e.target.value))}
              placeholder="your-name"
              className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-karte-text placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label
            htmlFor="displayName"
            className="mb-2 block text-sm font-medium text-karte-text"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={view.displayName}
            onChange={(e) => view.setDisplayName(e.target.value)}
            placeholder="Your Name"
            className="w-full rounded-lg border border-karte-border-emphasis bg-white/5 px-4 py-3 text-sm text-karte-text placeholder-gray-500 backdrop-blur-sm transition focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        {/* Bio */}
        <div>
          <label
            htmlFor="bio"
            className="mb-2 block text-sm font-medium text-karte-text"
          >
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            value={view.bio}
            onChange={(e) => view.setBio(e.target.value)}
            placeholder="A short bio about yourself..."
            className="w-full rounded-lg border border-karte-border-emphasis bg-white/5 px-4 py-3 text-sm text-karte-text placeholder-gray-500 backdrop-blur-sm transition focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>

        <div>
          <ImageUploadField
            pageId={view.page?.id}
            kind="avatar"
            label="Avatar Image"
            value={view.avatarUrl}
            onChange={view.setAvatarUrl}
            onUploadingChange={view.setUploadingAvatar}
            placeholder="https://example.com/avatar.jpg"
            helpText="Use a device upload for hosted storage, or paste a public image URL for your profile photo."
          />
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-medium text-karte-text">
              Theme
            </label>
            <span className="text-xs text-karte-text-4">
              Switch the look of your public page
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_PRESETS.map((preset) => {
              const isSelected = view.themePresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => view.setThemePresetId(preset.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-white/50 bg-white/10'
                      : 'border-karte-border-emphasis bg-white/5 hover:border-white/30 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: preset.gradientFrom }}
                    />
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: preset.gradientTo }}
                    />
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: preset.accentColor }}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-karte-text">
                    {preset.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-karte-text-3">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Publish Toggle (edit mode only) */}
        {view.isEditing && (
          <>
            <div>
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium text-karte-text">
                    Personal DMs
                  </h3>
                  <p className="text-xs text-karte-text-3">
                    Choose how visitors can message you from the floating DM
                    button.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {DM_MODE_OPTIONS.map((option) => {
                  const isSelected = view.dmMode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => view.setDmMode(option.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-white/50 bg-white/10'
                          : 'border-karte-border-emphasis bg-white/5 hover:border-white/30 hover:bg-white/[0.08]'
                      }`}
                    >
                      <p className="text-sm font-semibold text-karte-text">
                        {option.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-karte-text-3">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-karte-text">
                  Quick actions
                </h3>
                <p className="text-xs text-karte-text-3">
                  Optional URLs that appear as pill CTAs on your public page.
                  Leave blank to hide.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Location" htmlFor="loc">
                  <Input
                    id="loc"
                    value={view.location}
                    onChange={(e) => view.setLocation(e.target.value)}
                    placeholder="Bangalore, IN"
                  />
                </FormField>
                <FormField label="Booking link" htmlFor="cal">
                  <Input
                    id="cal"
                    type="url"
                    value={view.calendarUrl}
                    onChange={(e) => view.setCalendarUrl(e.target.value)}
                    placeholder="https://cal.com/you"
                  />
                </FormField>
                <FormField label="Newsletter link" htmlFor="news">
                  <Input
                    id="news"
                    type="url"
                    value={view.newsletterUrl}
                    onChange={(e) => view.setNewsletterUrl(e.target.value)}
                    placeholder="https://yoursubstack.substack.com"
                  />
                </FormField>
                <FormField label="Tip / Support link" htmlFor="tip">
                  <Input
                    id="tip"
                    type="url"
                    value={view.tipUrl}
                    onChange={(e) => view.setTipUrl(e.target.value)}
                    placeholder="https://ko-fi.com/you"
                  />
                </FormField>
                <FormField
                  label="Featured video"
                  htmlFor="video"
                  className="sm:col-span-2"
                  description="YouTube, Vimeo, or Loom — embeds at the top of your page."
                >
                  <Input
                    id="video"
                    type="url"
                    value={view.videoUrl}
                    onChange={(e) => view.setVideoUrl(e.target.value)}
                    placeholder="https://youtu.be/…"
                  />
                </FormField>
              </div>
            </div>

            {/* Roaming pet */}
            <div>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-karte-text">
                    Roaming pet
                  </h3>
                  <p className="text-xs text-karte-text-3">
                    A cartoon character that walks along the bottom of your
                    public page and pops up with AI-generated lines from your
                    wiki / newspaper / roast.
                  </p>
                </div>
                <Toggle
                  checked={view.petEnabled}
                  onChange={view.setPetEnabled}
                />
              </div>
              {view.petEnabled && (
                <div className="grid gap-3 sm:grid-cols-[1fr_72px]">
                  <FormField
                    label="Pet image URL"
                    htmlFor="pet"
                    description="Try DiceBear: e.g. https://api.dicebear.com/9.x/bottts/svg?seed=yourname"
                  >
                    <Input
                      id="pet"
                      type="url"
                      value={view.petUrl}
                      onChange={(e) => view.setPetUrl(e.target.value)}
                      placeholder="https://api.dicebear.com/9.x/bottts/svg?seed=…"
                    />
                  </FormField>
                  {view.petUrl.trim() && (
                    <div className="flex items-end justify-center pb-1">
                      <div
                        className="h-16 w-16 rounded-2xl bg-white/[0.025] bg-contain bg-center bg-no-repeat ring-1 ring-white/[0.08]"
                        style={{
                          backgroundImage: `url(${view.petUrl.trim()})`,
                        }}
                        title="Pet preview"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-karte-text">
                  Published
                </h3>
                <p className="text-xs text-karte-text-3">
                  Make your page visible to visitors
                </p>
              </div>
              <Toggle checked={view.published} onChange={view.setPublished} />
            </div>
          </>
        )}

        {/* Save / Create Button */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            onClick={view.handleSave}
            disabled={view.saving || view.uploadingAvatar}
            className="w-full rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:opacity-50 sm:w-auto"
          >
            {view.shouldClaimOnLogin
              ? 'Continue to Claim Username'
              : view.uploadingAvatar
                ? 'Uploading image...'
                : view.saving
                  ? 'Saving...'
                  : view.isEditing
                    ? 'Save'
                    : 'Create Page'}
          </button>
          {view.message && (
            <p
              className={`text-sm sm:max-w-sm ${
                view.isErrorMessage ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {view.message}
            </p>
          )}
        </div>

        {view.shouldClaimOnLogin && (
          <p className="text-sm text-karte-text-3">
            You can draft your profile now. We only ask you to sign in when you
            claim the username and save the page.
          </p>
        )}
      </div>
    </div>
  );
}
// ── Revamp preview panel ────────────────────────────────────────────
// Renders the AI-generated plan in a non-destructive preview so the
// owner can read the headline, rationale, theme target, and the
// blocks that would be added before any DB write happens.
function RevampPreview({
  plan,
  removals,
  applying,
  onApply,
  onDiscard,
}: {
  plan: RevampPlan;
  removals: RemovedSectionPreview[];
  applying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const themeLabel =
    THEME_PRESETS.find((t) => t.id === plan.themePresetId)?.id ??
    plan.themePresetId;
  const swatch = plan.customColors?.accentColor;
  return (
    <div className="mt-5 rounded-xl border border-karte-accent/30 bg-black/30 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-karte-accent-soft">
          · Preview
        </p>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-karte-text-4">
          Nothing saved yet
        </p>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold leading-tight text-karte-text">
        {plan.headline}
      </h3>
      <p className="mt-1.5 text-[12.5px] leading-[1.55] text-karte-text-3">
        {plan.rationale}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
        <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2.5 py-0.5 font-mono uppercase tracking-[0.14em] text-karte-text-3">
          Theme · {themeLabel}
        </span>
        {swatch && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.04] px-2.5 py-0.5 font-mono uppercase tracking-[0.14em] text-karte-text-3">
            <span
              aria-hidden="true"
              className="block h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: swatch }}
            />
            {swatch}
          </span>
        )}
        {plan.emphasis.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/[0.10] bg-white/[0.02] px-2.5 py-0.5 text-karte-text-4"
          >
            {tag}
          </span>
        ))}
      </div>

      {removals.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300/75">
            {removals.length} will be removed
          </p>
          <ul className="mt-2 space-y-1.5">
            {removals.map((section) => (
              <li
                key={section.id}
                className="flex items-baseline justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-3 py-2"
              >
                <p className="truncate text-[13px] font-medium text-karte-text/90 line-through decoration-rose-400/60">
                  {section.title}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-rose-300/70">
                  {section.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.blocks.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-karte-text-4">
            {plan.blocks.length} new{' '}
            {plan.blocks.length === 1 ? 'block' : 'blocks'}
          </p>
          <ul className="mt-2 space-y-2">
            {plan.blocks.map((block, i) => (
              <li
                key={i}
                className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-medium text-karte-text">
                    {block.title}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-karte-text-4">
                    {block.type}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 text-[12px] leading-[1.5] text-karte-text-3">
                  {block.content}
                </p>
                {block.type === 'cta' && block.buttonUrl && (
                  <p className="mt-2 truncate font-mono text-[11px] text-karte-accent-soft">
                    → {block.buttonLabel} · {block.buttonUrl}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDiscard}
          disabled={applying}
          className="rounded-xl border border-white/[0.12] px-4 py-2 text-[13px] font-medium text-karte-text-3 transition hover:bg-white/[0.04] hover:text-karte-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className="rounded-xl bg-karte-accent px-5 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-karte-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {applying ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </div>
  );
}
