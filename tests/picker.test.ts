import { describe, expect, it } from 'vitest';
import { collectSelectedNodes, countBookmarks, filterTree, toggleSelection } from '../src/lib/picker';
import type { BookmarkTreeNode } from '../src/lib/bookmarks';

const tree: BookmarkTreeNode[] = [
  {
    id: 'a',
    title: 'Folder A',
    dateAdded: 1,
    children: [
      { id: 'a1', title: 'Alpha', url: 'https://alpha.example', dateAdded: 2 },
      {
        id: 'ab',
        title: 'Folder AB',
        dateAdded: 3,
        children: [{ id: 'ab1', title: 'Beta', url: 'https://beta.example', dateAdded: 4 }]
      }
    ]
  },
  { id: 'c', title: 'Gamma', url: 'https://gamma.example', dateAdded: 5 }
];

describe('bookmark picker logic', () => {
  it('counts bookmarks recursively', () => {
    expect(countBookmarks(tree[0]!)).toBe(2);
    expect(countBookmarks(tree[1]!)).toBe(1);
  });

  it('selecting a folder selects its whole subtree', () => {
    const selected = toggleSelection(new Set(), tree[0]!);
    expect(selected.has('a')).toBe(true);
    expect(selected.has('a1')).toBe(true);
    expect(selected.has('ab')).toBe(true);
    expect(selected.has('ab1')).toBe(true);
    expect(selected.has('c')).toBe(false);
  });

  it('unselecting a folder clears its subtree', () => {
    const once = toggleSelection(new Set(), tree[0]!);
    const twice = toggleSelection(once, tree[0]!);
    expect(twice.size).toBe(0);
  });

  it('collects top-level selected subtrees only', () => {
    const selected = new Set(['a', 'a1', 'ab1']);
    const nodes = collectSelectedNodes(tree, selected);
    expect(nodes.map((node) => node.id)).toEqual(['a']);
  });

  it('collects a lone selected child without its parent', () => {
    const selected = new Set(['ab1']);
    const nodes = collectSelectedNodes(tree, selected);
    expect(nodes.map((node) => node.id)).toEqual(['ab1']);
  });

  it('filters the tree by title and keeps ancestors', () => {
    const filtered = filterTree(tree, 'beta');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('a');
    const child = filtered[0]?.children?.[0];
    expect(child?.id).toBe('ab');
    expect(child?.children?.[0]?.id).toBe('ab1');
  });
});
