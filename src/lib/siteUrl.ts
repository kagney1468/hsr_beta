/** Public site origin for share links (production default matches marketing domain). */
export function getSiteOrigin(): string {
  const env = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (env && /^https?:\/\//i.test(env.trim())) {
    return env.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://homesalesready.com';
}

export function getPackShareUrl(token: string): string {
  return `${getSiteOrigin()}/pack/${token}`;
}
