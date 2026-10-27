import { authClient } from '@/lib/auth-client';
import type { useContactFormSection } from './contact-form-section';
import { TurnstileWidget } from './turnstile-widget';

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '0x4AAAAAAECH9kgw7Nme6V3a';
export function ContactFormSectionView(
  view: ReturnType<typeof useContactFormSection>,
) {
  'use no memo';

  return (
    <form
      onSubmit={view.handleSubmit}
      className={view.compact ? 'space-y-3' : 'space-y-4'}
      aria-label="Contact profile owner"
    >
      {view.needsVerifiedSession ? (
        <div className="rounded-xl border border-karte-border-strong bg-white/[0.04] p-4">
          <p className="text-sm font-medium text-karte-text">
            Verify your email
          </p>
          <p className="mt-1 text-xs leading-5 text-white/55">
            Sign in with Google so the profile owner can see your verified
            sender identity before you message them.
          </p>
          <button
            type="button"
            disabled={view.isPending}
            onClick={() => {
              const callbackURL =
                typeof window === 'undefined' ? '/' : window.location.pathname;
              void authClient.signIn.social({
                provider: 'google',
                callbackURL,
              });
            }}
            className="mt-3 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:opacity-50"
          >
            {view.isPending ? 'Checking...' : 'Verify email to send'}
          </button>
        </div>
      ) : view.dmMode === 'email' && !view.requireVerifiedEmail ? (
        contactIdentityFields(view)
      ) : null}

      {!view.needsVerifiedSession && (
        <>
          {view.verifiedIdentity && (
            <p className="rounded-lg border border-green-400/15 bg-green-400/10 px-3 py-2 text-xs leading-5 text-green-200">
              The owner will see your verified email: {view.verifiedIdentity}
            </p>
          )}

          {view.dmMode === 'anonymous' && (
            <p className="rounded-lg border border-karte-border-strong bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/55">
              No name or email will be attached to this message.
            </p>
          )}

          <div>
            <label
              htmlFor={view.messageId}
              className="mb-1 block text-xs font-medium text-white/70"
            >
              Message
            </label>
            <textarea
              id={view.messageId}
              value={view.message}
              onChange={(e) => view.setMessage(e.target.value)}
              placeholder="What would you like to talk about?"
              rows={view.compact ? 4 : 5}
              className="w-full rounded-lg border border-karte-border-strong bg-white/5 px-3 py-2 text-sm text-karte-text placeholder-white/40 outline-none focus:border-white/30"
              required
            />
          </div>

          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            action="contact"
            resetSignal={view.turnstileResetSignal}
            onTokenChange={view.setTurnstileToken}
          />
        </>
      )}

      <button
        type="submit"
        disabled={
          view.loading || view.needsVerifiedSession || !view.turnstileToken
        }
        className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#17120a] shadow-[0_12px_34px_-28px_rgba(242,200,121,0.9)] transition hover:brightness-110 disabled:opacity-50"
        style={{ backgroundColor: view.accentColor }}
      >
        {view.loading ? 'Sending...' : 'Send Message'}
      </button>

      {view.status !== 'idle' && view.feedback && (
        <p
          className={`text-xs ${
            view.status === 'success' ? 'text-emerald-300' : 'text-red-300'
          }`}
        >
          {view.feedback}
        </p>
      )}
    </form>
  );
}

function contactIdentityFields(view: ReturnType<typeof useContactFormSection>) {
  'use no memo';
  return (
    <>
      <div>
        <label
          htmlFor={view.nameId}
          className="mb-1 block text-xs font-medium text-white/70"
        >
          Name
        </label>
        <input
          id={view.nameId}
          type="text"
          value={view.name}
          onChange={(e) => view.setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-karte-border-strong bg-white/5 px-3 py-2 text-sm text-karte-text placeholder-white/40 outline-none focus:border-white/30"
          required
        />
      </div>

      <div>
        <label
          htmlFor={view.emailId}
          className="mb-1 block text-xs font-medium text-white/70"
        >
          Email
        </label>
        <input
          id={view.emailId}
          type="email"
          value={view.email}
          onChange={(e) => view.setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-karte-border-strong bg-white/5 px-3 py-2 text-sm text-karte-text placeholder-white/40 outline-none focus:border-white/30"
          required
        />
      </div>
    </>
  );
}
