// Vertical-rule timeline render. Used on the public profile to show
// dated events. Receives an already-filtered, sorted list of events
// (server fetches + filters by status='published'). The Onyx-style
// gold rule on the left + monospace dates match the rest of the
// brand system.

import type { TimelineEventType } from '@/db/schema';
import { TIMELINE_TYPE_LABELS } from '@/lib/timeline';

interface TimelineEventDisplay {
  id: string;
  type: TimelineEventType;
  title: string;
  body: string | null;
  whereLabel: string | null;
  link: string | null;
  whenLabel: string;
}

interface TimelineSectionProps {
  events: ReadonlyArray<TimelineEventDisplay>;
  accentColor: string;
  /** Heading shown above the timeline. Default 'Timeline'. */
  heading?: string;
}

export function TimelineSection({
  events,
  accentColor,
  heading = 'Timeline',
}: TimelineSectionProps) {
  'use no memo';

  if (events.length === 0) return null;

  const recentEvents = events.length > 5 ? events.slice(0, 3) : events;
  const earlierEvents = events.length > 5 ? events.slice(3) : [];
  const renderEvent = (event: TimelineEventDisplay) => (
    <li key={event.id} className="relative">
      <span
        aria-hidden="true"
        className="absolute -left-[1.7rem] top-1.5 h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: accentColor,
          boxShadow: `0 0 0 3px rgba(10, 8, 5, 1), 0 0 0 4px ${accentColor}40`,
        }}
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-karte-text-4">
          {event.whenLabel}
          <span className="mx-2 opacity-50">·</span>
          <span style={{ color: accentColor }}>
            {TIMELINE_TYPE_LABELS[event.type] || 'Note'}
          </span>
        </p>
      </div>
      <h3 className="mt-1.5 text-[16px] font-semibold leading-tight text-karte-text sm:text-[17px]">
        {event.link ? (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:underline"
            data-track-type="timeline"
            data-track-id={event.id}
            data-track-label={event.title}
          >
            {event.title}
          </a>
        ) : (
          event.title
        )}
        {event.whereLabel && (
          <span className="ml-2 text-[14px] font-normal text-karte-text-3">
            @ {event.whereLabel}
          </span>
        )}
      </h3>
      {event.body && (
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-[1.55] text-karte-text-3">
          {event.body}
        </p>
      )}
    </li>
  );
  const listClassName = 'space-y-6 border-l-2 pl-6';
  const listStyle = { borderColor: `${accentColor}33` };

  return (
    <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl sm:p-7">
      <p
        className="text-[10.5px] font-medium uppercase tracking-[0.22em]"
        style={{ color: accentColor }}
      >
        ◆ {heading}
      </p>
      <ol className={`mt-6 ${listClassName}`} style={listStyle}>
        {recentEvents.map(renderEvent)}
      </ol>
      {earlierEvents.length > 0 && (
        <details className="group mt-6 border-t border-white/[0.08] pt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-karte-text-2 marker:hidden hover:text-karte-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-karte-accent [&::-webkit-details-marker]:hidden">
            <span>Explore {earlierEvents.length} earlier milestones</span>
            <svg
              aria-hidden="true"
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m4 7 6 6 6-6" />
            </svg>
          </summary>
          <ol className={`mt-6 ${listClassName}`} style={listStyle}>
            {earlierEvents.map(renderEvent)}
          </ol>
        </details>
      )}
    </section>
  );
}
