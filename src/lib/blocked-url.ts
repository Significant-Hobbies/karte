function isPrivateOrLocalIpv4(hostname: string): boolean {
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [, a, b] = ipv4.map(Number);
  return (
    a === 127 ||
    a === 10 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

function isLocalOrInternalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.includes('metadata') ||
    hostname.includes('internal') ||
    hostname === '[::1]' ||
    hostname.startsWith('[fe80:') ||
    hostname.startsWith('[fc') ||
    hostname.startsWith('[fd')
  );
}

export function isBlockedUrl(urlStr: string): boolean {
  try {
    const hostname = new URL(urlStr).hostname.toLowerCase();
    return isLocalOrInternalHost(hostname) || isPrivateOrLocalIpv4(hostname);
  } catch {
    return true;
  }
}
