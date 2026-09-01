import { vi } from 'vitest';
import type { BookmarkTreeNode } from '../../src/lib/bookmarks';

interface MockNode extends BookmarkTreeNode {
  children?: MockNode[];
}

export function createStorageArea(store: Record<string, unknown> = {}) {
  return {
    get: vi.fn(async (keys?: string | string[] | null) => {
      if (keys == null) return { ...store };
      const list = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of list) {
        if (key in store) result[key] = store[key];
      }
      return result;
    }),
    set: vi.fn(async (values: Record<string, unknown>) => {
      Object.assign(store, values);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) {
        delete store[key];
      }
    })
  };
}

export function installChromeMock(options: { initialRoots?: MockNode[] } = {}) {
  const localStore: Record<string, unknown> = {};
  const sessionStore: Record<string, unknown> = {};
  const local = createStorageArea(localStore);
  const session = createStorageArea(sessionStore);
  const roots: MockNode[] = options.initialRoots ?? [
    { id: '1', title: 'Bookmarks bar', dateAdded: 1, children: [] },
    { id: '2', title: 'Other bookmarks', dateAdded: 2, children: [] },
    { id: '3', title: 'Mobile bookmarks', dateAdded: 3, children: [] }
  ];

  function findNode(id: string): MockNode | null {
    const stack = [...roots];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.id === id) return node;
      stack.push(...(node.children ?? []));
    }
    return null;
  }

  function removeNode(id: string): boolean {
    const removeFrom = (nodes: MockNode[]): boolean => {
      const index = nodes.findIndex((node) => node.id === id);
      if (index !== -1) {
        nodes.splice(index, 1);
        return true;
      }
      for (const node of nodes) {
        if (node.children && removeFrom(node.children)) return true;
      }
      return false;
    };
    return removeFrom(roots);
  }

  const bookmarks = {
    getTree: vi.fn(async () => [{ id: '0', title: '', children: roots }]),
    getChildren: vi.fn(async (id: string) => findNode(id)?.children ?? []),
    create: vi.fn(async (node: chrome.bookmarks.CreateDetails) => {
      const created: MockNode = {
        id: `b${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
        title: node.title ?? '',
        url: node.url,
        dateAdded: Date.now(),
        children: node.url ? undefined : []
      };
      const parent = findNode(node.parentId ?? '1') ?? roots[0]!;
      parent.children ??= [];
      parent.children.push(created);
      return created;
    }),
    remove: vi.fn(async (id: string) => {
      if (!removeNode(id)) throw new Error(`Bookmark not found: ${id}`);
    }),
    removeTree: vi.fn(async (id: string) => {
      if (!removeNode(id)) throw new Error(`Bookmark not found: ${id}`);
    })
  };

  const chromeMock = {
    storage: {
      local,
      session,
      onChanged: { addListener: vi.fn() }
    },
    bookmarks,
    tabs: {
      create: vi.fn(async () => ({ id: 1 }))
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      getManifest: vi.fn(() => ({ action: { default_popup: 'src/popup/index.html' } })),
      sendMessage: vi.fn(async () => undefined),
      onMessage: { addListener: vi.fn() }
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: { addListener: vi.fn() }
    },
    commands: {
      onCommand: { addListener: vi.fn() }
    },
    action: {
      openPopup: vi.fn(async () => undefined)
    }
  };

  (globalThis as Record<string, unknown>).chrome = chromeMock;
  return { chrome: chromeMock, localStore, sessionStore, roots };
}
