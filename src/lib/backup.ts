import { verifyPassword } from './crypto';
import { validateDocument } from './vault-document';
import type { VaultDocument } from './types';
import { BACKUP_STAGING_KEY, VAULT_STORAGE_KEY } from './types';

export function serializeBackup(doc: VaultDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function downloadBackup(doc: VaultDocument): void {
  const blob = new Blob([serializeBackup(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gents-mark-backup.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): VaultDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('invalid backup format');
  }
  if (!validateDocument(parsed)) {
    throw new Error('invalid backup format');
  }
  return parsed;
}

export async function importBackup(
  text: string,
  password: string
): Promise<{ ok: boolean; doc?: VaultDocument; error?: string }> {
  try {
    const imported = parseBackup(text);
    const valid = await verifyPassword(password, imported);
    if (!valid) {
      return { ok: false, error: 'wrong password' };
    }
    await chrome.storage.local.set({ [BACKUP_STAGING_KEY]: imported });
    await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: imported });
    await chrome.storage.local.remove(BACKUP_STAGING_KEY);
    return { ok: true, doc: imported };
  } catch (error) {
    await chrome.storage.local.remove(BACKUP_STAGING_KEY);
    return { ok: false, error: String(error) };
  }
}
