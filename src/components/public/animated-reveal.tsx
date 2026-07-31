import type { CSSProperties, ReactNode } from 'react';

/**
 * Wraps children in a one-shot CSS entrance animation. Content is visible
 * from the first render; motion embellishes the handoff without an
 * IntersectionObserver briefly hiding resolved server content.
 *
 * Stagger via the `delay` prop in ms. Reduced-motion users see content
 * immediately with no animation.
 */
export function AnimatedReveal({
  children,
  delay = 0,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article';
}) {
  const style = {
    '--karte-reveal-delay': `${delay}ms`,
  } as CSSProperties;

  return (
    <As
      className={['animate-reveal', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </As>
  );
}
