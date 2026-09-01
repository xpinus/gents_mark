import type { VaultNode } from './types';
import { VAULT_FOLDER_NAME } from './types';

export interface BookmarkTreeNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: BookmarkTreeNode[];
}

export async function getBookmarkTree(): Promise<BookmarkTreeNode[]> {
  return (await chrome.bookmarks.getTree()) as unknown as BookmarkTreeNode[];
}

export function serializeSubtree(node: BookmarkTreeNode, parentPath: string[]): VaultNode {
  if (node.url) {
    return {
      kind: 'bookmark',
      title: node.title || node.url,
      url: node.url,
      parentPath,
      dateAdded: node.dateAdded
    };
  }
  const title = node.title || 'Untitled folder';
  return {
    kind: 'folder',
    title,
    parentPath,
    dateAdded: node.dateAdded,
    children: (node.children ?? []).map((child) => serializeSubtree(child, [...parentPath, title]))
  };
}

export function findNodeWithPath(
  nodes: BookmarkTreeNode[],
  targetId: string,
  path: string[] = []
): { node: BookmarkTreeNode; path: string[] } | null {
  for (const node of nodes) {
    const nextPath = [...path, node.title || 'Untitled folder'];
    if (node.id === targetId) {
      return { node, path: nextPath };
    }
    if (node.children) {
      const found = findNodeWithPath(node.children, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
}

export async function resolveParentId(nodes: BookmarkTreeNode[], path: string[]): Promise<string | null> {
  if (path.length === 0) return null;
  const rootTitle = path[0];
  const root = nodes.find((node) => node.title === rootTitle);
  if (!root?.id) return null;
  let current = root;
  for (let i = 1; i < path.length; i++) {
    const wanted = path[i];
    const child = current.children?.find((node) => !node.url && node.title === wanted);
    if (!child?.id) return null;
    current = child;
  }
  return current.id;
}

export async function createSubtree(parentId: string, node: VaultNode): Promise<string> {
  if (node.kind === 'bookmark') {
    const created = (await chrome.bookmarks.create({
      parentId,
      title: node.title,
      url: node.url
    })) as BookmarkTreeNode;
    return created.id;
  }
  const folder = (await chrome.bookmarks.create({
    parentId,
    title: node.title
  })) as BookmarkTreeNode;
  for (const child of node.children ?? []) {
    await createSubtree(folder.id, child);
  }
  return folder.id;
}

export async function removeNative(node: BookmarkTreeNode): Promise<void> {
  if (node.url) {
    await chrome.bookmarks.remove(node.id);
  } else {
    await chrome.bookmarks.removeTree(node.id);
  }
}

export async function ensureVaultFolder(nodes: BookmarkTreeNode[]): Promise<string> {
  const roots = nodes.filter((node) => !!node.id);
  const otherBookmarks = roots.find((node) => node.id === '2') ?? roots[0];
  if (!otherBookmarks) {
    throw new Error('No bookmark root available');
  }
  const existing = otherBookmarks.children?.find((node) => !node.url && node.title === VAULT_FOLDER_NAME);
  if (existing?.id) return existing.id;
  const created = (await chrome.bookmarks.create({
    parentId: otherBookmarks.id,
    title: VAULT_FOLDER_NAME
  })) as BookmarkTreeNode;
  return created.id;
}

export function collectSubtreeIds(node: BookmarkTreeNode, target: Set<string> = new Set()): Set<string> {
  target.add(node.id);
  for (const child of node.children ?? []) {
    collectSubtreeIds(child, target);
  }
  return target;
}
