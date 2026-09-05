import { beforeEach, describe, expect, it } from 'vitest';
import { installChromeMock } from './helpers/chrome-mock';
import { createVaultDocument } from '../src/lib/crypto';
import { mergeVaultDocuments, pullSyncedVault, pushSyncedVault, sameVaultMaster, splitRaw } from '../src/lib/sync';
import type { VaultDocument, VaultItem } from '../src/lib/types';

function item(id: string): VaultItem {
  return {
    id,
    createdAt: Number(id),
    payload: { enc: 'b64', iv: 'a', data: 'a'.repeat(2000) }
  };
}

describe('vault cloud sync', () => {
  beforeEach(() => {
    installChromeMock();
  });

  it('splits raw text into chunks that fit the per-item limit', () => {
    const raw = 'x'.repeat(20_000);
    const chunks = splitRaw(raw);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => new TextEncoder().encode(chunk).length <= 7000)).toBe(true);
    expect(chunks.join('')).toBe(raw);
  });

  it('round-trips a document larger than one sync item', async () => {
    const doc = await createVaultDocument('sync-password');
    doc.items = Array.from({ length: 15 }, (_, index) => item(String(index)));
    const raw = JSON.stringify(doc);
    expect(new TextEncoder().encode(raw).length).toBeGreaterThan(7000);
    await pushSyncedVault(doc);
    await expect(pullSyncedVault()).resolves.toEqual(doc);
  });

  it('merges documents that share the same master password', async () => {
    const local = await createVaultDocument('same-password');
    const remote = await createVaultDocument('same-password');
    // createVaultDocument uses a fresh salt each time, so force identical credentials metadata.
    local.items = [item('1')];
    remote.encryptionSalt = local.encryptionSalt;
    remote.hashSalt = local.hashSalt;
    remote.passwordHash = local.passwordHash;
    remote.keyIterations = local.keyIterations;
    remote.hashIterations = local.hashIterations;
    remote.items = [item('2')];
    const merged = mergeVaultDocuments(local, remote);
    expect(merged.items.map((entry) => entry.id).sort()).toEqual(['1', '2']);
    expect(sameVaultMaster(local, remote)).toBe(true);
  });

  it('does not merge vaults with different master passwords', async () => {
    const local = await createVaultDocument('password-a');
    const remote = await createVaultDocument('password-b');
    expect(sameVaultMaster(local, remote)).toBe(false);
    expect(() => mergeVaultDocuments(local, remote)).toThrow();
  });

  it('reads the legacy single-key sync format', async () => {
    const doc = await createVaultDocument('legacy-password');
    await chrome.storage.sync.set({ vault: JSON.stringify(doc) });
    await expect(pullSyncedVault()).resolves.toEqual(doc);
  });
});
