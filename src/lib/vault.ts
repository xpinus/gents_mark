import type { BookmarkTreeNode } from './bookmarks';
import { findNodeWithPath, getBookmarkTree, resolveParentId, ensureVaultFolder, createSubtree, removeNative, serializeSubtree } from './bookmarks';
import { decryptText, encryptText } from './crypto';
import { generateId, isFolderNode, validateDocument } from './vault-document';
import type { DecryptedVaultItem, LockResult, VaultDocument, VaultItem, VaultNode } from './types';
import { VAULT_STORAGE_KEY } from './types';

export async function loadDocument(): Promise<VaultDocument | null> {
  const result = await chrome.storage.local.get(VAULT_STORAGE_KEY);
  const doc = result[VAULT_STORAGE_KEY];
  return validateDocument(doc) ? doc : null;
}

export async function saveDocument(doc: VaultDocument): Promise<void> {
  await chrome.storage.local.set({ [VAULT_STORAGE_KEY]: doc });
}

export async function lockNativeNodes(
  doc: VaultDocument,
  key: CryptoKey,
  tree: BookmarkTreeNode[],
  nodes: BookmarkTreeNode[]
): Promise<LockResult[]> {
  const results: LockResult[] = [];
  for (const node of nodes) {
    const found = findNodeWithPath(tree, node.id);
    const parentPath = found?.path.slice(0, -1) ?? [];
    const serialized = serializeSubtree(node, parentPath);
    const payload = await encryptText(key, JSON.stringify(serialized));
    const item: VaultItem = { id: generateId(), createdAt: Date.now(), payload };
    doc.items.push(item);
    await saveDocument(doc);
    try {
      await removeNative(node);
      results.push({ ok: true, title: node.title || node.url || 'Bookmark' });
    } catch (error) {
      doc.items = doc.items.filter((existing) => existing.id !== item.id);
      await saveDocument(doc);
      results.push({ ok: false, title: node.title || node.url || 'Bookmark', error: String(error) });
    }
  }
  return results;
}

export async function addUrlToVault(
  doc: VaultDocument,
  key: CryptoKey,
  pending: { url: string; title: string }
): Promise<void> {
  const node: VaultNode = {
    kind: 'bookmark',
    title: pending.title || pending.url,
    url: pending.url,
    parentPath: []
  };
  const payload = await encryptText(key, JSON.stringify(node));
  doc.items.push({ id: generateId(), createdAt: Date.now(), payload });
  await saveDocument(doc);
}

export async function decryptVaultItems(doc: VaultDocument, key: CryptoKey): Promise<DecryptedVaultItem[]> {
  const items: DecryptedVaultItem[] = [];
  for (const item of doc.items) {
    const plain = await decryptText(key, item.payload);
    items.push({ id: item.id, createdAt: item.createdAt, node: JSON.parse(plain) as VaultNode });
  }
  return items;
}

export function filterVaultItems(items: DecryptedVaultItem[], query: string): DecryptedVaultItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => {
    const title = (item.node.title || '').toLowerCase();
    const url = (item.node.url || '').toLowerCase();
    return title.includes(needle) || url.includes(needle);
  });
}

export async function restoreVaultItem(
  doc: VaultDocument,
  key: CryptoKey,
  itemId: string,
  tree?: BookmarkTreeNode[]
): Promise<void> {
  const index = doc.items.findIndex((item) => item.id === itemId);
  if (index === -1) throw new Error('Vault item not found');
  const item = doc.items[index]!;
  const plain = await decryptText(key, item.payload);
  const node = JSON.parse(plain) as VaultNode;
  const bookmarkTree = tree ?? (await getTopLevelTree());
  let parentId: string | null = null;
  if (node.parentPath.length > 0) {
    parentId = await resolveParentId(bookmarkTree, node.parentPath);
  }
  if (!parentId) {
    parentId = await ensureVaultFolder(bookmarkTree);
  }
  await createSubtree(parentId, node);
  doc.items = doc.items.filter((existing) => existing.id !== itemId);
  await saveDocument(doc);
}

async function getTopLevelTree(): Promise<BookmarkTreeNode[]> {
  const tree = await getBookmarkTree();
  return tree[0]?.children ?? [];
}

export async function deleteVaultItem(doc: VaultDocument, itemId: string): Promise<void> {
  doc.items = doc.items.filter((item) => item.id !== itemId);
  await saveDocument(doc);
}

export async function openVaultUrl(url: string): Promise<void> {
  await chrome.tabs.create({ url });
}

export function isFolderItem(item: DecryptedVaultItem): boolean {
  return isFolderNode(item.node);
}
