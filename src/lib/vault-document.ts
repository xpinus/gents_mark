import type { EncryptedPayload, VaultDocument, VaultItem, VaultNode } from './types';

export function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isValidPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<EncryptedPayload>;
  return payload.enc === 'b64' && typeof payload.iv === 'string' && typeof payload.data === 'string';
}

export function isValidVaultItem(value: unknown): value is VaultItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<VaultItem>;
  return typeof item.id === 'string' && typeof item.createdAt === 'number' && isValidPayload(item.payload);
}

export function validateDocument(value: unknown): value is VaultDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<VaultDocument>;
  return (
    doc.version === 1 &&
    typeof doc.encryptionSalt === 'string' &&
    typeof doc.hashSalt === 'string' &&
    typeof doc.passwordHash === 'string' &&
    typeof doc.keyIterations === 'number' &&
    typeof doc.hashIterations === 'number' &&
    Array.isArray(doc.items) &&
    doc.items.every(isValidVaultItem)
  );
}

export function isFolderNode(node: VaultNode): boolean {
  return node.kind === 'folder';
}
