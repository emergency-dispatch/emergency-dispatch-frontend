export const DEFAULT_AVATAR = '/assets/default-avatar.svg';

export const getAvatarUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_AVATAR;
  }
  return url;
};
