export function t(key: string, fallback = key): string {
  return chrome.i18n.getMessage(key) || fallback;
}

export function tArgs(key: string, substitutions: string | string[], fallback = key): string {
  return chrome.i18n.getMessage(key, substitutions) || fallback;
}
