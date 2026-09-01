import type { BookmarkTreeNode } from './bookmarks';

export function isFolder(node: BookmarkTreeNode): boolean {
  return !node.url;
}

export function countBookmarks(node: BookmarkTreeNode): number {
  if (node.url) return 1;
  let count = 0;
  for (const child of node.children ?? []) {
    count += countBookmarks(child);
  }
  return count;
}

export function collectDescendantIds(node: BookmarkTreeNode, target: Set<string> = new Set()): Set<string> {
  target.add(node.id);
  for (const child of node.children ?? []) {
    collectDescendantIds(child, target);
  }
  return target;
}

export function toggleSelection(selected: Set<string>, node: BookmarkTreeNode): Set<string> {
  const next = new Set(selected);
  const ids = collectDescendantIds(node);
  const isChecked = next.has(node.id);
  if (isChecked) {
    for (const id of ids) next.delete(id);
  } else {
    for (const id of ids) next.add(id);
  }
  return next;
}

export function collectSelectedNodes(tree: BookmarkTreeNode[], selected: Set<string>): BookmarkTreeNode[] {
  const result: BookmarkTreeNode[] = [];
  const walk = (nodes: BookmarkTreeNode[], ancestorSelected: boolean): void => {
    for (const node of nodes) {
      const isSelected = selected.has(node.id);
      if (isSelected && !ancestorSelected) {
        result.push(node);
      }
      if (node.children) {
        walk(node.children, ancestorSelected || isSelected);
      }
    }
  };
  walk(tree, false);
  return result;
}

function matchesQuery(node: BookmarkTreeNode, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const title = (node.title || '').toLowerCase();
  const url = (node.url || '').toLowerCase();
  return title.includes(needle) || url.includes(needle);
}

export function filterTree(tree: BookmarkTreeNode[], query: string): BookmarkTreeNode[] {
  const result: BookmarkTreeNode[] = [];
  for (const node of tree) {
    if (matchesQuery(node, query)) {
      result.push({ ...node, children: node.children ? [...node.children] : undefined });
      continue;
    }
    if (node.children) {
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }
  return result;
}
