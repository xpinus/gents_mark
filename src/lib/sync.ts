import type { VaultDocument } from './types';
import { validateDocument } from './vault-document';

const SYNC_MANIFEST_KEY = 'gmSyncV1';
const SYNC_PART_PREFIX = 'gmSyncV1:';
const LEGACY_SYNC_KEY = 'vault';
const MAX_PART_BYTES = 7000;
const MAX_TOTAL_BYTES = 90_000;

export interface SyncManifest {
  version: 1;
  updatedAt: number;
  count: number;
}

export function sameVaultMaster(a: VaultDocument, b: VaultDocument): boolean {
  return (
    a.encryptionSalt === b.encryptionSalt &&
    a.hashSalt === b.hashSalt &&
    a.passwordHash === b.passwordHash &&
    a.keyIterations === b.keyIterations &&
    a.hashIterations === b.hashIterations
  );
}

export function mergeVaultDocuments(local: VaultDocument, remote: VaultDocument): VaultDocument {
  if (!sameVaultMaster(local, remote)) {
    throw new Error('Vault passwords differ');
  }
  const seen = new Set(local.items.map((item) => item.id));
  const additions = remote.items.filter((item) => !seen.has(item.id));
  if (additions.length === 0) return local;
  return { ...local, items: [...local.items, ...additions] };
}

function textBytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function splitRaw(raw: string, maxBytes = MAX_PART_BYTES): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < raw.length) {
    let end = Math.min(start + maxBytes, raw.length);
    while (end > start && textBytes(raw.slice(start, end)) > maxBytes) {
      end--;
    }
    if (end <= start) {
      end = start + 1;
    }
    chunks.push(raw.slice(start, end));
    start = end;
  }
  return chunks;
}

function latestActivity(doc: VaultDocument): number {
  return doc.items.reduce((latest, item) => Math.max(latest, item.createdAt), 0) || Date.now();
}

export async function pushSyncedVault(doc: VaultDocument): Promise<void> {
  const raw = JSON.stringify(doc);
  if (textBytes(raw) > MAX_TOTAL_BYTES) {
    throw new Error('Vault data exceeds cloud sync limit');
  }
  const chunks = splitRaw(raw);
  const manifest: SyncManifest = {
    version: 1,
    updatedAt: latestActivity(doc),
    count: chunks.length
  };
  const entries: Record<string, unknown> = { [SYNC_MANIFEST_KEY]: manifest };
  chunks.forEach((chunk, index) => {
    entries[`${SYNC_PART_PREFIX}${index}`] = chunk;
  });
  await chrome.storage.sync.set(entries);

  // Remove stale parts and the old single-key format after a successful write.
  const all = await chrome.storage.sync.get(null);
  const stale = Object.keys(all).filter(
    (key) =>
      (key === SYNC_MANIFEST_KEY || key === LEGACY_SYNC_KEY || key.startsWith(SYNC_PART_PREFIX)) &&
      !(key in entries)
  );
  if (stale.length > 0) {
    await chrome.storage.sync.remove(stale);
  }
}

export async function pullSyncedVault(): Promise<VaultDocument | null> {
  const result = await chrome.storage.sync.get([SYNC_MANIFEST_KEY, LEGACY_SYNC_KEY]);
  const manifest = result[SYNC_MANIFEST_KEY] as SyncManifest | undefined;
  if (manifest && typeof manifest === 'object' && manifest.version === 1 && typeof manifest.count === 'number') {
    const keys = Array.from({ length: manifest.count }, (_, index) => `${SYNC_PART_PREFIX}${index}`);
    const parts = await chrome.storage.sync.get(keys);
    const raw = keys.map((key) => parts[key]).filter((part): part is string => typeof part === 'string').join('');
    return parseVault(raw);
  }
  const legacy = result[LEGACY_SYNC_KEY];
  if (typeof legacy === 'string') {
    return parseVault(legacy);
  }
  return null;
}

function parseVault(raw: string): VaultDocument | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return validateDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
