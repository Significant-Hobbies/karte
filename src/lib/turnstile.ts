import 'server-only';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;
const SITEVERIFY_TIMEOUT_MS = 10_000;

type SiteverifyResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

function configuredHostnames() {
  return (process.env.TURNSTILE_HOSTNAMES ?? '')
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedHostname(hostname: string, allowed: string[]) {
  const normalized = hostname.trim().toLowerCase();
  return allowed.some(
    (candidate) =>
      normalized === candidate || normalized.endsWith(`.${candidate}`),
  );
}

export async function verifyTurnstile({
  token,
  action,
  remoteIp,
}: {
  token: unknown;
  action: string;
  remoteIp?: string;
}) {
  const secret = process.env.TURNSTILE_SECRET?.trim();
  const hostnames = configuredHostnames();

  if (
    !secret ||
    hostnames.length === 0 ||
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp && remoteIp !== 'unknown') {
    body.set('remoteip', remoteIp);
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as SiteverifyResult;
    return (
      result.success === true &&
      result.action === action &&
      typeof result.hostname === 'string' &&
      isAllowedHostname(result.hostname, hostnames)
    );
  } catch {
    return false;
  }
}
