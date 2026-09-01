import { beforeEach, describe, expect, it } from 'vitest';
import { installChromeMock } from './helpers/chrome-mock';
import { createVaultDocument, deriveEncryptionKey } from '../src/lib/crypto';
import { addUrlToVault, decryptVaultItems, deleteVaultItem, filterVaultItems, loadDocument, lockNativeNodes, restoreVaultItem } from '../src/lib/vault';
import { fromBase64 } from '../src/lib/secure-utils';
import type { BookmarkTreeNode } from '../src/lib/bookmarks';
import type { VaultDocument } from '../src/lib/types';
import { VAULT_STORAGE_KEY } from '../src/lib/types';

describe('vault operations', () => {
  let doc: VaultDocument;
  let key: CryptoKey;

  beforeEach(async () => {
    installChromeMock({
      initialRoots: [
        {
          id: '1',
          title: 'Bookmarks bar',
          dateAdded: 1,
          children: []
        },
        {
          id: '2',
          title: 'Other bookmarks',
          dateAdded: 2,
          children: [
            {
              id: 'f1',
              title: 'Sensitive',
              dateAdded: 10,
              children: [
                { id: 'b1', title: 'Secret site', url: 'https://secret.example.com', dateAdded: 11 }
              ]
            }
          ]
        },
        {
          id: '3',
          title: 'Mobile bookmarks',
          dateAdded: 3,
          children: []
        }
      ]
    });
    doc = await createVaultDocument('master-password');
    key = await deriveEncryptionKey('master-password', fromBase64(doc.encryptionSalt), doc.keyIterations);
  });

  it('locks a folder subtree and removes it from the native tree', async () => {
    const tree = (await (globalThis as any).chrome.bookmarks.getTree())[0].children;
    const other = tree.find((node: BookmarkTreeNode) => node.id === '2');
    const folder = other.children.find((node: BookmarkTreeNode) => node.id === 'f1');
    const results = await lockNativeNodes(doc, key, tree, [folder]);
    expect(results[0]?.ok).toBe(true);
    expect(doc.items).toHaveLength(1);
    expect((globalThis as any).chrome.bookmarks.removeTree).toHaveBeenCalledWith('f1');
    const stored = await loadDocument();
    expect(stored?.items).toHaveLength(1);
  });

  it('restores a locked folder under its original parent', async () => {
    const tree = (await (globalThis as any).chrome.bookmarks.getTree())[0].children;
    const other = tree.find((node: BookmarkTreeNode) => node.id === '2');
    const folder = other.children.find((node: BookmarkTreeNode) => node.id === 'f1');
    await lockNativeNodes(doc, key, tree, [folder]);
    const itemId = doc.items[0]!.id;
    const restoredTree = (await (globalThis as any).chrome.bookmarks.getTree())[0].children;
    await restoreVaultItem(doc, key, itemId, restoredTree);
    expect(doc.items).toHaveLength(0);
    const after = (await (globalThis as any).chrome.bookmarks.getTree())[0].children;
    const restoredOther = after.find((node: BookmarkTreeNode) => node.id === '2');
    expect(restoredOther?.children?.some((node: BookmarkTreeNode) => node.title === 'Sensitive')).toBe(true);
  });

  it('adds a URL directly to the vault', async () => {
    await addUrlToVault(doc, key, { url: 'https://example.com', title: 'Example' });
    const items = await decryptVaultItems(doc, key);
    expect(items).toHaveLength(1);
    expect(items[0]?.node.url).toBe('https://example.com');
  });

  it('deletes an item from the vault', async () => {
    await addUrlToVault(doc, key, { url: 'https://example.com', title: 'Example' });
    const itemId = doc.items[0]!.id;
    await deleteVaultItem(doc, itemId);
    expect(doc.items).toHaveLength(0);
    const stored = await chrome.storage.local.get(VAULT_STORAGE_KEY);
    expect((stored[VAULT_STORAGE_KEY] as VaultDocument).items).toHaveLength(0);
  });

  it('filters vault items case-insensitively', async () => {
    await addUrlToVault(doc, key, { url: 'https://Secret.example.com', title: 'Top Secret' });
    await addUrlToVault(doc, key, { url: 'https://plain.example.com', title: 'Plain' });
    const items = await decryptVaultItems(doc, key);
    expect(filterVaultItems(items, 'secret')).toHaveLength(1);
    expect(filterVaultItems(items, 'PLAIN')).toHaveLength(1);
  });
});
