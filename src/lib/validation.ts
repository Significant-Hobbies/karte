const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const ALLOWED_IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_SIZE_MB = Math.floor(
  MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024),
);

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:']);

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/** Reject visibly truncated links without guessing their intended destination. */
export function isCompletePublicUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  try {
    return !/(?:\.{3}|…)(?:$|[/?#&])/u.test(decodeURIComponent(url));
  } catch {
    return false;
  }
}

export function publicArticleLinkLabel(url: string): string {
  const parsed = new URL(url);
  return parsed.pathname === '/' ? 'Visit website' : 'Read article';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isSupportedImageContentType(contentType: string): boolean {
  return ALLOWED_IMAGE_CONTENT_TYPES.includes(
    contentType as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number],
  );
}

export const MAX_CONTENT_LENGTH = 50_000;
export const MAX_BIO_LENGTH = 500;
export const MAX_TITLE_LENGTH = 100;
export const MAX_PROJECT_DESCRIPTION_LENGTH = 500;
export const MAX_PROJECT_URL_LENGTH = 2_048;
export const MAX_SECTION_CONTENT_LENGTH = 2_000;
export const MAX_CONTACT_MESSAGE_LENGTH = 2_000;
export const MAX_CONTACT_NAME_LENGTH = 100;
export const MAX_CHAT_SYSTEM_PROMPT_LENGTH = 2_000;
