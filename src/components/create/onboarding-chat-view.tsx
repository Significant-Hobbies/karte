import type { useOnboardingChat } from './onboarding-chat';

export function OnboardingChatView(view: ReturnType<typeof useOnboardingChat>) {
  'use no memo';

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
      {introduction()}

      <div
        ref={view.scrollRef}
        className="mt-6 max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-black/30 p-4"
      >
        {view.messages.length === 0 && view.loading && (
          <p className="text-[13px] italic text-karte-text-4">
            Booting the bot…
          </p>
        )}
        {view.messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-[1.5] ${
                m.role === 'user'
                  ? 'bg-karte-accent/15 text-karte-text ring-1 ring-karte-accent/25'
                  : 'bg-white/[0.05] text-karte-text-2'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {view.loading && view.messages.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/[0.05] px-3.5 py-2 text-[13px] text-karte-text-4">
              …
            </div>
          </div>
        )}
      </div>

      {view.error && (
        <p className="mt-3 text-[13px] text-rose-300/90" role="alert">
          {view.error}
        </p>
      )}

      <form
        onSubmit={view.handleSubmit}
        className="mt-4 flex items-stretch gap-2"
      >
        <input
          type="text"
          value={view.draft}
          onChange={(event) => view.setDraft(event.target.value)}
          placeholder={
            view.done ? 'Onboarding done — claim your page →' : 'Say something…'
          }
          disabled={view.loading || view.done}
          className="min-w-0 flex-1 rounded-xl bg-white/[0.045] px-4 py-3 text-[14px] text-karte-text placeholder:text-karte-text-4 outline-none ring-1 ring-inset ring-transparent transition-all duration-200 ease-[var(--karte-ease)] hover:bg-white/[0.06] focus:bg-white/[0.06] focus:ring-karte-accent/35 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={view.loading || !view.draft.trim() || view.done}
          className="shrink-0 rounded-xl bg-karte-accent px-5 py-3 text-[14px] font-semibold text-zinc-950 transition-all duration-200 ease-[var(--karte-ease)] hover:bg-karte-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {view.summary.length > 0 && (
        <div className="mt-6 rounded-2xl bg-white/[0.025] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-karte-text-4">
            Captured so far
          </p>
          <ul className="mt-2 space-y-1 text-[13px] leading-[1.55] text-karte-text-2">
            {view.summary.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-1 text-karte-accent">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.done && (
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-[13px] text-karte-text-3">
            Looking good? Sign in to claim the page.
          </p>
          <button
            type="button"
            onClick={view.handleClaim}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-medium text-zinc-950 transition-all duration-200 ease-[var(--karte-ease)] hover:bg-zinc-100"
          >
            Claim your Karte page
            <span className="transition-transform duration-200 ease-[var(--karte-ease)] group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

function introduction() {
  'use no memo';
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-karte-text-4">
          <span className="text-karte-accent/80">·</span> Guided
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.02em] text-karte-text sm:text-3xl">
          Have a quick chat,{' '}
          <span
            className="font-normal italic text-karte-accent-soft"
            style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
          >
            we&apos;ll build your page.
          </span>
        </h2>
        <p className="mt-3 max-w-xl text-[14px] leading-[1.6] text-karte-text-3">
          Tell me your name, what you do, and what you want on the page —
          booking, newsletter, links, projects. I&apos;ll wire it together.
        </p>
      </div>
    </div>
  );
}
