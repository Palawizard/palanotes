const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defence on top of SameSite=Lax: a state-changing request must come from our own origin.
export function isAllowedOrigin(method: string, headers: Headers, publicOrigin: string): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) {
    return true;
  }
  const origin = headers.get('origin');
  if (origin !== null) {
    return origin === publicOrigin;
  }
  return headers.get('sec-fetch-site') === 'same-origin';
}
