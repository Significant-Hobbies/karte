export function isBlockedUrl(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr);
    const lower = hostname.toLowerCase();

    if (
      lower === 'localhost' ||
      lower.endsWith('.local') ||
      lower.endsWith('.internal')
    )
      return true;
    if (lower.includes('metadata') || lower.includes('internal')) return true;

    const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [, a, b] = ipv4.map(Number);
      const privateOrLocal =
        a === 127 ||
        a === 10 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 192 && b === 168) ||
        (a === 172 && b >= 16 && b <= 31);
      if (privateOrLocal) return true;
    }

    if (
      lower === '[::1]' ||
      lower.startsWith('[fe80:') ||
      lower.startsWith('[fc') ||
      lower.startsWith('[fd')
    )
      return true;

    return false;
  } catch {
    return true;
  }
}
