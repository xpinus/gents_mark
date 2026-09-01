import type { GmSession } from './types';
import { AUTO_LOCK_MS, SESSION_STORAGE_KEY } from './types';

export async function getSession(): Promise<GmSession | null> {
  const result = await chrome.storage.session.get(SESSION_STORAGE_KEY);
  const session = result[SESSION_STORAGE_KEY];
  return session && typeof session === 'object' ? (session as GmSession) : null;
}

export async function setSession(session: GmSession): Promise<void> {
  await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.session.remove(SESSION_STORAGE_KEY);
}

export async function touchActivity(): Promise<void> {
  const session = await getSession();
  if (session) {
    session.lastActivity = Date.now();
    await setSession(session);
  }
}

export function isSessionExpired(session: GmSession): boolean {
  return Date.now() - session.lastActivity > AUTO_LOCK_MS;
}

export async function resolveFreshSession(): Promise<GmSession | null> {
  const session = await getSession();
  if (!session) return null;
  if (isSessionExpired(session)) {
    await clearSession();
    return null;
  }
  return session;
}
