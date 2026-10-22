export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23E2E8F0"/><circle cx="50" cy="38" r="18" fill="%2394A3B8"/><path d="M20 86C20 69.4315 33.4315 56 50 56C66.5685 56 80 69.4315 80 86" fill="%2394A3B8"/></svg>';

export const getAvatarUrl = (url?: string | null, name?: string): string => {
  if (
    !url ||
    typeof url !== 'string' ||
    url.trim() === '' ||
    url === 'null' ||
    url === 'undefined'
  ) {
    if (name && name.trim()) {
      const initial = encodeURIComponent(name.trim().charAt(0).toUpperCase());
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23DC2626"/><text x="50" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="bold" fill="%23FFFFFF" text-anchor="middle" dominant-baseline="central">${initial}</text></svg>`;
    }
    return DEFAULT_AVATAR;
  }
  return url;
};
