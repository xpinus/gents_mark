import { describe, expect, it } from 'vitest';
import { createSession, createVaultDocument, decryptText, deriveEncryptionKey, encryptText, restoreKey, verifyPassword } from '../src/lib/crypto';
import { fromBase64 } from '../src/lib/secure-utils';

describe('vault crypto', () => {
  it('creates a versioned document with distinct salts and no items', async () => {
    const doc = await createVaultDocument('gentleman-secret');
    expect(doc.version).toBe(1);
    expect(doc.encryptionSalt).not.toBe(doc.hashSalt);
    expect(doc.items).toEqual([]);
  });

  it('uses unique salts for the same password', async () => {
    const first = await createVaultDocument('same-password');
    const second = await createVaultDocument('same-password');
    expect(first.encryptionSalt).not.toBe(second.encryptionSalt);
    expect(first.hashSalt).not.toBe(second.hashSalt);
  });

  it('verifies correct and wrong passwords', async () => {
    const doc = await createVaultDocument('correct-password');
    await expect(verifyPassword('correct-password', doc)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', doc)).resolves.toBe(false);
  });

  it('encrypts and decrypts text round-trip', async () => {
    const doc = await createVaultDocument('round-trip');
    const key = await deriveEncryptionKey('round-trip', fromBase64(doc.encryptionSalt), doc.keyIterations);
    const payload = await encryptText(key, '{"title":"Top Secret","url":"https://example.com"}');
    expect(payload.enc).toBe('b64');
    await expect(decryptText(key, payload)).resolves.toBe('{"title":"Top Secret","url":"https://example.com"}');
  });

  it('recovers the key from the session wrapper', async () => {
    const doc = await createVaultDocument('session-key');
    const session = await createSession('session-key', doc);
    const restored = await restoreKey(session);
    const payload = await encryptText(restored, 'hello vault');
    await expect(decryptText(restored, payload)).resolves.toBe('hello vault');
  });
});
