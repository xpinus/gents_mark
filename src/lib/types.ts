export const VAULT_STORAGE_KEY = 'vaultDocument';
export const SESSION_STORAGE_KEY = 'gmSession';
export const PENDING_KEY = 'pendingBookmark';
export const BACKUP_STAGING_KEY = 'vaultImportStaging';
export const AUTO_LOCK_MS = 5 * 60 * 1000;
export const VAULT_FOLDER_NAME = "Gents' Mark 金库";

export interface EncryptedPayload {
  enc: 'b64';
  iv: string;
  data: string;
}

export interface VaultItem {
  id: string;
  createdAt: number;
  payload: EncryptedPayload;
}

export interface VaultDocument {
  version: 1;
  encryptionSalt: string;
  hashSalt: string;
  passwordHash: string;
  keyIterations: number;
  hashIterations: number;
  items: VaultItem[];
}

export interface VaultNode {
  kind: 'folder' | 'bookmark';
  title: string;
  url?: string;
  parentPath: string[];
  dateAdded?: number;
  children?: VaultNode[];
}

export interface DecryptedVaultItem {
  id: string;
  createdAt: number;
  node: VaultNode;
}

export interface GmSession {
  wrappedKey: string;
  wrapKeyRaw: string;
  salt: string;
  lastActivity: number;
}

export interface PendingBookmark {
  url: string;
  title: string;
}

export interface LockResult {
  ok: boolean;
  title: string;
  error?: string;
}
