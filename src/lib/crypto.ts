import type { EncryptedPayload, GmSession, VaultDocument } from './types';
import { constantTimeEqual, fromBase64, randomBytes, toBase64, wipeArray } from './secure-utils';

export const KEY_ITERATIONS = 600_000;
export const HASH_ITERATIONS = 1_000_000;
export const ENCRYPTION_SALT_BYTES = 32;
export const HASH_SALT_BYTES = 16;
export const IV_BYTES = 12;

export async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  extractable = false
): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);
  try {
    const material = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    );
  } finally {
    wipeArray(passwordBuffer);
  }
}

export async function derivePasswordHash(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const passwordBuffer = new TextEncoder().encode(password);
  try {
    const material = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      material,
      256
    );
    return new Uint8Array(bits);
  } finally {
    wipeArray(passwordBuffer);
  }
}

export async function createVaultDocument(password: string): Promise<VaultDocument> {
  const encryptionSalt = randomBytes(ENCRYPTION_SALT_BYTES);
  const hashSalt = randomBytes(HASH_SALT_BYTES);
  const passwordHash = await derivePasswordHash(password, hashSalt, HASH_ITERATIONS);
  return {
    version: 1,
    encryptionSalt: toBase64(encryptionSalt),
    hashSalt: toBase64(hashSalt),
    passwordHash: toBase64(passwordHash),
    keyIterations: KEY_ITERATIONS,
    hashIterations: HASH_ITERATIONS,
    items: []
  };
}

export async function verifyPassword(password: string, document: VaultDocument): Promise<boolean> {
  const salt = fromBase64(document.hashSalt);
  const storedHash = fromBase64(document.passwordHash);
  const computedHash = await derivePasswordHash(password, salt, document.hashIterations);
  const valid = constantTimeEqual(computedHash, storedHash);
  wipeArray(computedHash);
  return valid;
}

export async function encryptText(key: CryptoKey, text: string): Promise<EncryptedPayload> {
  const iv = randomBytes(IV_BYTES);
  const encoded = new TextEncoder().encode(text);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    enc: 'b64',
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(cipher))
  };
}

export async function decryptText(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const iv = fromBase64(payload.iv);
  const data = fromBase64(payload.data);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}

export async function createSession(password: string, document: VaultDocument): Promise<GmSession> {
  const salt = fromBase64(document.encryptionSalt);
  const key = await deriveEncryptionKey(password, salt, document.keyIterations, true);
  const wrapKey = await crypto.subtle.generateKey({ name: 'AES-KW', length: 256 }, true, ['wrapKey', 'unwrapKey']);
  const wrapKeyRaw = await crypto.subtle.exportKey('raw', wrapKey);
  const wrapped = await crypto.subtle.wrapKey('raw', key, wrapKey, 'AES-KW');
  return {
    wrappedKey: toBase64(new Uint8Array(wrapped)),
    wrapKeyRaw: toBase64(new Uint8Array(wrapKeyRaw)),
    salt: document.encryptionSalt,
    lastActivity: Date.now()
  };
}

export async function restoreKey(session: GmSession): Promise<CryptoKey> {
  const wrapKeyRaw = fromBase64(session.wrapKeyRaw);
  const wrapped = fromBase64(session.wrappedKey);
  const wrapKey = await crypto.subtle.importKey('raw', wrapKeyRaw, { name: 'AES-KW' }, false, ['unwrapKey']);
  return await crypto.subtle.unwrapKey(
    'raw',
    wrapped,
    wrapKey,
    { name: 'AES-KW' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
