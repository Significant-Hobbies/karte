import { SiteHeader } from '@saas-maker/ui/blocks/site-header';

interface Props {
  links: { label: string; href: string }[];
}

// Keep the template's responsive navigation; use the login card's brand mark.
export default function GalleryHeader({ links }: Props) {
  return (
    <SiteHeader
      className="karte-gallery-header"
      brand={{
        name: 'Karte',
        mark: (
          <span className="karte-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M8 7 h16 a4 4 0 0 1 4 4 v9 a4 4 0 0 1 -4 4 h-9 l-4 4 v-4 h-3 a4 4 0 0 1 -4 -4 v-9 a4 4 0 0 1 4 -4 Z"
                fill="#0a0a0a"
              />
              <circle cx="13" cy="15.5" r="1.25" fill="#c4a46b" />
              <circle cx="16.5" cy="15.5" r="1.25" fill="#c4a46b" />
              <circle cx="20" cy="15.5" r="1.25" fill="#c4a46b" />
            </svg>
          </span>
        ),
      }}
      links={links}
    />
  );
}
