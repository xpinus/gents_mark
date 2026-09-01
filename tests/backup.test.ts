import { beforeEach, describe, expect, it } from 'vitest';
import { installChromeMock } from './helpers/chrome-mock';
import { createVaultDocument } from '../src/lib/crypto';
import { importBackup, parseBackup, serializeBackup } from '../src/lib/backup';
import type { VaultDocument } from '../src/lib/types';
import { VAULT_STORAGE_KEY } from '../src/lib/types';

describe('backup', () => {
  beforeEach(() => {
    installChromeMock();
  });

  it('round-trips through serialize and parse', async () => {
    const doc = await createVaultDocument('backup-password');
    const parsed = parseBackup(serializeBackup(doc));
    expect(parsed).toEqual(doc);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow();
  });

  it('rejects a valid JSON file with the wrong shape', () => {
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow();
  });

  it('imports a valid backup with the correct password', async () => {
    const doc = await createVaultDocument('backup-password');
    const result = await importBackup(serializeBackup(doc), 'backup-password');
    expect(result.ok).toBe(true);
    const stored = await chrome.storage.local.get(VAULT_STORAGE_KEY);
    expect(stored[VAULT_STORAGE_KEY]).toEqual(doc);
  });

  it('rejects a valid backup with the wrong password and leaves storage unchanged', async () => {
    const current = await createVaultDocument('current-password');
    await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: current });
    const incoming = await createVaultDocument('incoming-password');
    const result = await importBackup(serializeBackup(incoming), 'wrong-password');
    expect(result.ok).toBe(false);
    const stored = await chrome.storage.local.get(VAULT_STORAGE_KEY);
    expect((stored[VAULT_STORAGE_KEY] as VaultDocument).passwordHash).toBe(current.passwordHash);
  });
});
