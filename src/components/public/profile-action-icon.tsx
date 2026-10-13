import type { SVGProps } from 'react';

export type ProfileActionIconName =
  | 'calendar'
  | 'mail'
  | 'coffee'
  | 'chat'
  | 'close'
  | 'flame';

const paths = {
  calendar:
    'M8 3v4M16 3v4M3 11h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  mail: 'M3 7l9 6 9-6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  coffee:
    'M6 3v2M10 3v2M14 3v2M4 8h12v6a6 6 0 0 1-12 0V8ZM16 8h2a3 3 0 0 1 0 6h-2M2 21h18',
  chat: 'M21 14a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7Z',
  close: 'M6 6l12 12M18 6 6 18',
  flame: 'M12 3c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-4 3-6 0 2 1 3 2 4V3Z',
} satisfies Record<ProfileActionIconName, string>;

export function ProfileActionIcon({
  name,
  className = 'h-4 w-4 shrink-0',
  ...props
}: SVGProps<SVGSVGElement> & { name: ProfileActionIconName }) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
