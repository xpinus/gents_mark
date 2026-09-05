import { createSession, createVaultDocument, deriveEncryptionKey, restoreKey, verifyPassword } from '../lib/crypto';
import { downloadBackup, importBackup, parseBackup } from '../lib/backup';
import { mergeVaultDocuments, pullSyncedVault, pushSyncedVault, sameVaultMaster } from '../lib/sync';
import { clearSession, getSession, isSessionExpired, setSession, touchActivity } from '../lib/session';
import { fromBase64 } from '../lib/secure-utils';
import { getBookmarkTree } from '../lib/bookmarks';
import type { BookmarkTreeNode } from '../lib/bookmarks';
import { collectSelectedNodes, countBookmarks, filterTree, toggleSelection } from '../lib/picker';
import { t, tArgs } from '../lib/i18n';
import {
  addUrlToVault,
  decryptVaultItems,
  deleteVaultItem,
  deleteVaultChildNode,
  restoreVaultChildNode,
  filterVaultItems,
  loadDocument,
  lockNativeNodes,
  openVaultUrl,
  restoreVaultItem,
  saveDocument
} from '../lib/vault';
import type { DecryptedVaultItem, PendingBookmark, VaultDocument, VaultNode } from '../lib/types';
import { PENDING_KEY, SESSION_STORAGE_KEY } from '../lib/types';
import lockSvgRaw from './icons/lock.svg?raw';
import unlockSvgRaw from './icons/unlock.svg?raw';
import importSvgRaw from './icons/import.svg?raw';
import exportSvgRaw from './icons/export.svg?raw';
import addSvgRaw from './icons/add.svg?raw';
import tipSvgRaw from './icons/tip.svg?raw';
import emptySvgRaw from './icons/empty.svg?raw';
import syncSvgRaw from './icons/sync.svg?raw';
import openSvgRaw from './icons/open.svg?raw';
import restoreSvgRaw from './icons/restore.svg?raw';
import deleteSvgRaw from './icons/delete.svg?raw';

const app = document.getElementById('app')!;

let doc: VaultDocument | null = null;
let key: CryptoKey | null = null;
let decrypted: DecryptedVaultItem[] = [];
let autoLockCheck: number | undefined;
let pickerTree: BookmarkTreeNode[] = [];

function svgIcon(raw: string, className?: string): SVGSVGElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = raw;
  const svg = wrapper.firstElementChild as SVGSVGElement;
  if (className) svg.classList.add(className);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return svg;
}

function h<T extends HTMLElement>(tag: string, className?: string, text?: string): T {
  const el = document.createElement(tag) as T;
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function clearApp(): void {
  app.replaceChildren();
}

function showToast(message: string, isError = false): void {
  const toast = h('div', `toast${isError ? ' error' : ''}`, message);
  app.append(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function openModal(content: HTMLElement): HTMLDivElement {
  const overlay = h<HTMLDivElement>('div', 'modal-overlay');
  overlay.append(content);
  app.append(overlay);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
  return overlay;
}

function confirmDialog(title: string, body: string, confirmLabel: string, onConfirm: () => void | Promise<void>): void {
  const modal = h('div', 'modal');
  modal.append(h('h2', 'modal-title', title));
  modal.append(h('p', 'modal-subtitle', body));
  const actions = h('div', 'modal-actions');
  const cancel = h('button', undefined, t('cancel'));
  const confirm = h<HTMLButtonElement>('button', 'primary', confirmLabel);
  actions.append(cancel, confirm);
  modal.append(actions);
  const overlay = openModal(modal);
  cancel.addEventListener('click', () => overlay.remove());
  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    try {
      await onConfirm();
    } finally {
      overlay.remove();
    }
  });
}

async function getPending(): Promise<PendingBookmark | null> {
  const result = await chrome.storage.session.get(PENDING_KEY);
  const pending = result[PENDING_KEY];
  return pending && typeof pending === 'object' ? (pending as PendingBookmark) : null;
}

async function clearPending(): Promise<void> {
  await chrome.storage.session.remove(PENDING_KEY);
}

function startAutoLock(): void {
  stopAutoLock();
  const events = ['mousemove', 'mousedown', 'click', 'keydown', 'input', 'focus'] as const;
  for (const eventName of events) {
    document.addEventListener(eventName, () => void touchActivity(), { passive: true });
  }
  autoLockCheck = window.setInterval(() => void checkAutoLock(), 30_000);
}

function stopAutoLock(): void {
  if (autoLockCheck !== undefined) {
    window.clearInterval(autoLockCheck);
    autoLockCheck = undefined;
  }
}

async function checkAutoLock(): Promise<void> {
  const session = await getSession();
  if (session && isSessionExpired(session)) {
    await lockVault();
  }
}


async function syncVault(): Promise<void> {
  if (!doc) return;
  try {
    const remote = await pullSyncedVault();
    if (remote) {
      if (!sameVaultMaster(doc, remote)) {
        showSyncConflictModal(remote);
        return;
      }
      const merged = mergeVaultDocuments(doc, remote);
      if (merged.items.length !== doc.items.length) {
        doc = merged;
        await saveDocument(doc);
      }
    }
    await pushSyncedVault(doc);
    if (key) {
      decrypted = await decryptVaultItems(doc, key);
      renderMain();
    }
    showToast(t('syncSuccess'));
  } catch (error) {
    showToast(`${t('syncFailed')}: ${String(error)}`, true);
  }
}

function showSyncConflictModal(remote: VaultDocument): void {
  const modal = h('div', 'modal');
  modal.append(h('h2', 'modal-title', t('sync')), h('p', 'modal-subtitle', t('syncConflict')));
  const actions = h('div', 'modal-actions');
  const cancel = h('button', undefined, t('cancel'));
  const keepLocal = h<HTMLButtonElement>('button', 'primary', t('syncKeepLocal'));
  const useCloud = h<HTMLButtonElement>('button', undefined, t('syncUseCloud'));
  actions.append(keepLocal, useCloud, cancel);
  modal.append(actions);
  const overlay = openModal(modal);

  cancel.addEventListener('click', () => overlay.remove());
  keepLocal.addEventListener('click', async () => {
    keepLocal.disabled = true;
    try {
      if (doc) await pushSyncedVault(doc);
      overlay.remove();
      showToast(t('syncSuccess'));
    } catch (error) {
      showToast(`${t('syncFailed')}: ${String(error)}`, true);
      keepLocal.disabled = false;
    }
  });
  useCloud.addEventListener('click', () => {
    overlay.remove();
    showCloudPasswordPrompt(remote);
  });
}

function showCloudPasswordPrompt(remote: VaultDocument): void {
  const modal = h('div', 'modal');
  modal.append(h('h2', 'modal-title', t('syncUseCloud')), h('p', 'modal-subtitle', t('syncCloudPrompt')));
  const pass = h<HTMLInputElement>('input');
  pass.type = 'password';
  modal.append(pass);
  const actions = h('div', 'modal-actions');
  const cancel = h('button', undefined, t('cancel'));
  const submit = h<HTMLButtonElement>('button', 'primary', t('unlock'));
  actions.append(cancel, submit);
  modal.append(actions);
  const overlay = openModal(modal);

  cancel.addEventListener('click', () => overlay.remove());
  submit.addEventListener('click', async () => {
    submit.disabled = true;
    try {
      const valid = await verifyPassword(pass.value, remote);
      if (!valid) {
        showToast(t('wrongPassword'), true);
        submit.disabled = false;
        return;
      }
      doc = remote;
      key = await deriveEncryptionKey(pass.value, fromBase64(doc.encryptionSalt), doc.keyIterations);
      await setSession(await createSession(pass.value, doc));
      await saveDocument(doc);
      await pushSyncedVault(doc);
      decrypted = await decryptVaultItems(doc, key);
      overlay.remove();
      renderMain();
      showToast(t('syncSuccess'));
    } catch (error) {
      showToast(`${t('syncFailed')}: ${String(error)}`, true);
      submit.disabled = false;
    }
  });
}

async function applyCloudSync(): Promise<void> {
  let remote: VaultDocument | null = null;
  try {
    remote = await pullSyncedVault();
  } catch {
    return;
  }
  if (!remote) return;
  if (!doc) {
    doc = remote;
    await saveDocument(doc);
    try {
      await pushSyncedVault(doc);
    } catch {
      // Best-effort migration of the legacy single-key format.
    }
    return;
  }
  if (!sameVaultMaster(doc, remote)) return;
  const merged = mergeVaultDocuments(doc, remote);
  if (merged.items.length !== doc.items.length) {
    doc = merged;
    await saveDocument(doc);
    try {
      await pushSyncedVault(doc);
    } catch {
      // Local merge is still valid even if the cloud write fails.
    }
  }
}
async function lockVault(): Promise<void> {
  stopAutoLock();
  key = null;
  decrypted = [];
  try {
    await clearSession();
  } catch {
    // Session may already be gone.
  }
  render();
}

async function unlock(password: string): Promise<void> {
  if (!doc) return;
  const valid = await verifyPassword(password, doc);
  if (!valid) {
    showToast(t('wrongPassword'), true);
    return;
  }
  key = await deriveEncryptionKey(password, fromBase64(doc.encryptionSalt), doc.keyIterations);
  await setSession(await createSession(password, doc));
  decrypted = await decryptVaultItems(doc, key);
  render();
  startAutoLock();
}

async function setupVault(password: string): Promise<void> {
  doc = await createVaultDocument(password);
  await saveDocument(doc);
  key = await deriveEncryptionKey(password, fromBase64(doc.encryptionSalt), doc.keyIterations);
  await setSession(await createSession(password, doc));
  decrypted = [];
  render();
  startAutoLock();
}

function renderSetup(): void {
  clearApp();
  const card = h('div', 'auth-card');
  card.append(h('h1', 'title', t('setupTitle')));

  const passField = h('div', 'field');
  passField.append(h('label', undefined, t('setupSubtitle')));
  const pass = h<HTMLInputElement>('input');
  pass.type = 'password';
  passField.append(pass);

  const confirmField = h('div', 'field');
  confirmField.append(h('label', undefined, t('confirmPassword')));
  const confirm = h<HTMLInputElement>('input');
  confirm.type = 'password';
  confirmField.append(confirm);

  const warningRow = h('label', 'check-row');
  const acknowledged = h<HTMLInputElement>('input');
  acknowledged.type = 'checkbox';
  warningRow.append(acknowledged, h('span', undefined, t('nonRecoveryWarning')));

  const submit = h<HTMLButtonElement>('button', 'primary', t('createVault'));
  submit.style.width = '100%';
  card.append(passField, confirmField, warningRow, submit);
  app.append(card);

  submit.addEventListener('click', async () => {
    if (pass.value.length < 8) {
      showToast(t('passwordTooShort'), true);
      return;
    }
    if (pass.value !== confirm.value) {
      showToast(t('passwordMismatch'), true);
      return;
    }
    if (!acknowledged.checked) {
      showToast(t('nonRecoveryWarning'), true);
      return;
    }
    submit.disabled = true;
    try {
      await setupVault(pass.value);
      pass.value = '';
      confirm.value = '';
    } catch (error) {
      showToast(`${t('setupError')}: ${String(error)}`, true);
      submit.disabled = false;
    }
  });
}

function renderLocked(): void {
  clearApp();
  const card = h('div', 'auth-card');
  const lockIcon = svgIcon(unlockSvgRaw, 'lock-icon');
  card.append(lockIcon, h('h1', 'title', t('unlockTitle')));
  const field = h('div', 'field');
  field.append(h('label', undefined, t('unlockSubtitle')));
  const pass = h<HTMLInputElement>('input');
  pass.type = 'password';
  pass.placeholder = t('passwordPlaceholder');
  field.append(pass);
  const submit = h<HTMLButtonElement>('button', 'primary', t('unlock'));
  submit.style.width = '100%';
  card.append(field, submit);
  app.append(card);

  const run = async (): Promise<void> => {
    submit.disabled = true;
    submit.textContent = t('unlocking');
    try {
      await unlock(pass.value);
      pass.value = '';
    } catch (error) {
      showToast(`${t('genericError')}: ${String(error)}`, true);
    } finally {
      submit.disabled = false;
      submit.textContent = t('unlock');
    }
  };
  submit.addEventListener('click', () => void run());
  pass.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') void run();
  });
}

function renderList(query: string): HTMLElement {
  const list = h('div', 'vault-list');
  const items = filterVaultItems(decrypted, query);
  if (items.length === 0) {
    const empty = h('div', 'empty');
    empty.append(svgIcon(emptySvgRaw, 'empty-icon'), h('div', undefined, t('emptyVault')), h('div', undefined, t('emptyVaultHint')));
    list.append(empty);
    return list;
  }
  for (const item of items) {
    list.append(renderVaultItem(item));
  }
  return list;
}

function renderVaultItem(item: DecryptedVaultItem): HTMLElement {
  const container = h('div');

  const isFolder = item.node.kind === 'folder';
  const row = h('div', isFolder ? 'vault-item vault-folder' : 'vault-item');
  const hasChildren = isFolder && (item.node.children?.length ?? 0) > 0;

  const chevron = h<HTMLButtonElement>('button', 'ghost vault-chevron', hasChildren ? '▾' : '▸');
  chevron.style.padding = '0 2px';
  chevron.style.display = hasChildren ? '' : 'none';

  const body = h('div', 'body');
  body.append(h('div', 'name', item.node.title || item.node.url || ''));
  if (!isFolder && item.node.url) {
    body.append(h('div', 'meta', item.node.url));
  }
  const actions = h('div', 'actions');
  if (item.node.kind === 'bookmark' && item.node.url) {
    const open = h('button', undefined);
    open.title = t('open');
    open.append(svgIcon(openSvgRaw, 'action-icon'));
    open.addEventListener('click', () => void openVaultUrl(item.node.url!));
    actions.append(open);
  }
  const restore = h('button', undefined);
  restore.title = t('restore');
  restore.append(svgIcon(restoreSvgRaw, 'action-icon'));
  restore.addEventListener('click', () => {
    confirmDialog(t('restore'), t('restoreConfirm'), t('restore'), async () => {
      if (!doc || !key) return;
      await restoreVaultItem(doc, key, item.id);
      decrypted = await decryptVaultItems(doc, key);
      renderMain();
    });
  });
  const remove = h('button', 'danger');
  remove.title = t('delete');
  remove.append(svgIcon(deleteSvgRaw, 'action-icon'));
  remove.addEventListener('click', () => {
    confirmDialog(t('delete'), t('deleteConfirm'), t('delete'), async () => {
      if (!doc) return;
      await deleteVaultItem(doc, item.id);
      decrypted = await decryptVaultItems(doc, key!);
      renderMain();
    });
  });
  actions.append(restore, remove);
  if (isFolder) {
    row.append(chevron, body, actions);
  } else {
    row.append(chevron, body, actions);
  }
  container.append(row);

  if (hasChildren) {
    const childrenHost = h('div', 'vault-children');
    childrenHost.hidden = false;
    for (let i = 0; i < item.node.children!.length; i++) {
      childrenHost.append(renderVaultChild(item.node.children![i]!, 1, item.id, [i]));
    }
    container.append(childrenHost);

    chevron.addEventListener('click', () => {
      childrenHost.hidden = !childrenHost.hidden;
      chevron.textContent = childrenHost.hidden ? '▸' : '▾';
    });
  }

  return container;
}

function renderVaultChild(node: VaultNode, depth: number, parentId: string, childPath: number[]): HTMLElement {
  const isFolder = node.kind === 'folder';
  const row = h('div', isFolder ? 'vault-item vault-child vault-folder' : 'vault-item vault-child');
  row.style.paddingLeft = `${8 + depth * 16}px`;

  const hasGrandchildren = isFolder && (node.children?.length ?? 0) > 0;
  const chevron = h<HTMLButtonElement>('button', 'ghost vault-chevron', hasGrandchildren ? '▾' : '▸');
  chevron.style.padding = '0 2px';
  chevron.style.minWidth = '20px';
  chevron.style.display = hasGrandchildren ? '' : 'none';

  const body = h('div', 'body');
  body.append(h('div', 'name', node.title || node.url || ''));
  if (!isFolder && node.url) {
    body.append(h('div', 'meta', node.url));
  }

  const actions = h('div', 'actions');
  if (node.kind === 'bookmark' && node.url) {
    const open = h('button', undefined);
    open.title = t('open');
    open.append(svgIcon(openSvgRaw, 'action-icon'));
    open.addEventListener('click', () => void openVaultUrl(node.url!));
    actions.append(open);
  }
  const restore = h('button', undefined);
  restore.title = t('restore');
  restore.append(svgIcon(restoreSvgRaw, 'action-icon'));
  restore.addEventListener('click', () => {
    confirmDialog(t('restore'), t('restoreConfirm'), t('restore'), async () => {
      if (!doc || !key) return;
      await restoreVaultChildNode(doc, key, parentId, childPath);
      decrypted = await decryptVaultItems(doc, key);
      renderMain();
    });
  });
  const remove = h('button', 'danger');
  remove.title = t('delete');
  remove.append(svgIcon(deleteSvgRaw, 'action-icon'));
  remove.addEventListener('click', () => {
    confirmDialog(t('delete'), t('deleteConfirm'), t('delete'), async () => {
      if (!doc) return;
      await deleteVaultChildNode(doc, key!, parentId, childPath);
      decrypted = await decryptVaultItems(doc, key!);
      renderMain();
    });
  });
  actions.append(restore, remove);
  if (isFolder) {
    row.append(chevron, body, actions);
  } else {
    row.append(chevron, body, actions);
  }

  const container = h('div');
  container.append(row);

  if (hasGrandchildren) {
    const childrenHost = h('div', 'vault-children');
    childrenHost.hidden = true;
    for (let i = 0; i < node.children!.length; i++) {
      childrenHost.append(renderVaultChild(node.children![i]!, depth + 1, parentId, [...childPath, i]));
    }
    container.append(childrenHost);

    chevron.addEventListener('click', () => {
      childrenHost.hidden = !childrenHost.hidden;
      chevron.textContent = childrenHost.hidden ? '▸' : '▾';
    });
  }

  return container;
}

function renderPendingBanner(pending: PendingBookmark | null): HTMLElement | null {
  if (!pending) return null;
  const banner = h('div', 'pending-banner');
  banner.append(h('div', 'pending-title', t('pendingTitle')), h('div', 'pending-url', pending.url), h('div', undefined, t('pendingHint')));
  const actions = h('div', 'pending-actions');
  const add = h('button', 'primary', t('addToVault'));
  const dismiss = h('button', 'ghost', t('dismiss'));
  actions.append(add, dismiss);
  banner.append(actions);

  add.addEventListener('click', async () => {
    if (!doc || !key) return;
    try {
      await addUrlToVault(doc, key, pending);
      await clearPending();
      decrypted = await decryptVaultItems(doc, key);
      renderMain();
    } catch (error) {
      showToast(`${t('genericError')}: ${String(error)}`, true);
    }
  });
  dismiss.addEventListener('click', async () => {
    await clearPending();
    renderMain();
  });
  return banner;
}

function renderMain(): void {
  clearApp();
  const root = h('div', 'view main');

  const header = h('div', 'header');
  const brand = h('div', 'brand');
  brand.append(h('span', undefined, t('vaultTitle')));
  const lock = h<HTMLButtonElement>('button', 'ghost');
  lock.append(svgIcon(lockSvgRaw, 'lock-btn-icon'));
  lock.append(t('lockNow'));
  lock.addEventListener('click', async () => { await lockVault(); window.close(); });

  const syncBtn = h<HTMLButtonElement>('button', 'ghost');
  syncBtn.append(svgIcon(syncSvgRaw, 'lock-btn-icon'));
  syncBtn.append(t('sync'));
  syncBtn.addEventListener('click', () => void syncVault());
  const headerRight = h('div', 'header-right');
  headerRight.append(syncBtn, lock);
  header.append(brand, headerRight);

  const toolbar = h('div', 'toolbar');
  const pickerButton = h<HTMLButtonElement>('button', 'primary');
  pickerButton.append(svgIcon(addSvgRaw, 'toolbar-icon'));
  pickerButton.append(t('addBookmarks'));
  const exportButton = h<HTMLButtonElement>('button');
  exportButton.append(svgIcon(exportSvgRaw, 'toolbar-icon'));
  exportButton.append(t('exportBackup'));
  const importButton = h<HTMLButtonElement>('button');
  importButton.append(svgIcon(importSvgRaw, 'toolbar-icon'));
  importButton.append(t('importBackup'));
  const fileInput = h<HTMLInputElement>('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  toolbar.append(pickerButton, exportButton, importButton);

  const search = h('div', 'search');
  const searchInput = h<HTMLInputElement>('input');
  searchInput.type = 'text';
  searchInput.placeholder = t('searchPlaceholder');
  search.append(searchInput);

  const listHost = h('div', 'list-host');

  const footer = h('div', 'footer');
  footer.append(svgIcon(tipSvgRaw, 'footer-icon'), t('autoLockHint'));

  root.append(header, toolbar, search, listHost, footer, fileInput);
  app.append(root);

  const renderInto = (): void => {
    listHost.replaceChildren(renderList(searchInput.value));
  };
  renderInto();
  searchInput.addEventListener('input', renderInto);

  pickerButton.addEventListener('click', () => void openPicker());
  exportButton.addEventListener('click', () => {
    if (!doc) return;
    try {
      downloadBackup(doc);
      showToast(t('backupSuccess'));
    } catch (error) {
      showToast(`${t('backupFailed')}: ${String(error)}`, true);
    }
  });
  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    void file.text().then((text) => handleImport(text)).catch((error) => showToast(`${t('importFailed')}: ${String(error)}`, true));
    fileInput.value = '';
  });

  void getPending().then((pending) => {
    const banner = renderPendingBanner(pending);
    if (banner) root.insertBefore(banner, toolbar);
  });
}

function renderPickerNode(
  node: BookmarkTreeNode,
  depth: number,
  selected: Set<string>,
  onToggle: () => void
): HTMLElement {
  const row = h('div', 'picker-node');
  row.style.paddingLeft = `${8 + depth * 14}px`;
  const chevron = h<HTMLButtonElement>('button', 'ghost', '▾');
  chevron.style.padding = '0 4px';
  chevron.style.minWidth = '22px';
  chevron.disabled = !node.children?.length;
  const checkbox = h<HTMLInputElement>('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selected.has(node.id);
  const label = h('span', 'label', node.title || (node.url ? node.url : 'Untitled'));
  row.append(chevron, checkbox, label);
  if (!node.url) {
    row.append(h('span', 'count', String(countBookmarks(node))));
  }
  checkbox.addEventListener('change', () => {
    const next = toggleSelection(selected, node);
    selected.clear();
    for (const id of next) selected.add(id);
    onToggle();
  });
  const container = h('div');
  const childrenHost = h('div');
  container.append(row, childrenHost);
  for (const child of node.children ?? []) {
    childrenHost.append(renderPickerNode(child, depth + 1, selected, onToggle));
  }
  chevron.addEventListener('click', () => {
    childrenHost.hidden = !childrenHost.hidden;
    chevron.textContent = childrenHost.hidden ? '▸' : '▾';
  });
  return container;
}

async function openPicker(): Promise<void> {
  if (!doc || !key) return;
  const tree = await getBookmarkTree();
  pickerTree = tree[0]?.children ?? [];
  const selected = new Set<string>();
  const picker = h('div', 'picker-modal');
  const headerEl = h('div', 'picker-header');
  headerEl.append(h('h2', 'modal-title', t('pickerTitle')), h('p', 'modal-subtitle', t('pickerSubtitle')));
  const search = h<HTMLInputElement>('input');
  search.type = 'text';
  search.placeholder = t('searchPlaceholder');
  headerEl.append(search);
  picker.append(headerEl);

  const body = h('div', 'picker-body');
  const treeHost = h('div', 'picker-tree');
  body.append(treeHost);
  picker.append(body);

  const footerEl = h('div', 'picker-footer');
  const cancel = h('button', undefined, t('cancel'));
  const confirm = h<HTMLButtonElement>('button', 'primary', t('lockSelected'));
  confirm.disabled = true;
  footerEl.append(cancel, confirm);
  picker.append(footerEl);

  app.append(picker);

  const renderTree = (): void => {
    const query = search.value;
    const visible = query.trim() ? filterTree(pickerTree, query) : pickerTree;
    treeHost.replaceChildren(...visible.map((node) => renderPickerNode(node, 0, selected, () => {
      confirm.disabled = selected.size === 0;
      renderTree();
    })));
  };
  renderTree();
  search.addEventListener('input', renderTree);

  cancel.addEventListener('click', () => picker.remove());
  confirm.addEventListener('click', async () => {
    const nodes = collectSelectedNodes(pickerTree, selected);
    if (nodes.length === 0) return;
    confirmDialog(t('confirmLock'), `${t('lockWarning')}`, t('lockSelected'), async () => {
      const results = await lockNativeNodes(doc!, key!, pickerTree, nodes);
      const failed = results.filter((result) => !result.ok);
      decrypted = await decryptVaultItems(doc!, key!);
      picker.remove();
      renderMain();
      if (failed.length === 0) {
        showToast(tArgs('lockedCount', [String(results.length)]));
      } else {
        showToast(t('lockFailed'), true);
      }
    });
  });
}

async function handleImport(text: string): Promise<void> {
  let imported: VaultDocument;
  try {
    imported = parseBackup(text);
  } catch {
    showToast(t('invalidBackup'), true);
    return;
  }
  confirmDialog(t('importTitle'), t('importConfirm'), t('importBackup'), async () => {
    const modal = h('div', 'modal');
    modal.append(h('h2', 'modal-title', t('importTitle')), h('p', 'modal-subtitle', t('masterPasswordRequired')));
    const pass = h<HTMLInputElement>('input');
    pass.type = 'password';
    modal.append(pass);
    const actions = h('div', 'modal-actions');
    const cancel = h('button', undefined, t('cancel'));
    const submit = h<HTMLButtonElement>('button', 'primary', t('importBackup'));
    actions.append(cancel, submit);
    modal.append(actions);
    const overlay = openModal(modal);
    cancel.addEventListener('click', () => overlay.remove());
    submit.addEventListener('click', async () => {
      submit.disabled = true;
      const result = await importBackup(text, pass.value);
      if (!result.ok || !result.doc) {
        showToast(t('importFailed'), true);
        submit.disabled = false;
        return;
      }
      doc = result.doc;
      key = await deriveEncryptionKey(pass.value, fromBase64(doc.encryptionSalt), doc.keyIterations);
      await setSession(await createSession(pass.value, doc));
      decrypted = await decryptVaultItems(doc, key);
      overlay.remove();
      renderMain();
      showToast(t('importSuccess'));
    });
  });
}

function render(): void {
  if (!doc) {
    renderSetup();
    return;
  }
  if (!key) {
    renderLocked();
    return;
  }
  renderMain();
}

async function init(): Promise<void> {
  doc = await loadDocument();
  await applyCloudSync();
  const session = await getSession();
  if (doc && session && !isSessionExpired(session)) {
    try {
      key = await restoreKey(session);
      decrypted = await decryptVaultItems(doc, key);
      render();
      startAutoLock();
      return;
    } catch {
      await clearSession();
    }
  } else if (doc && session && isSessionExpired(session)) {
    await clearSession();
  }
  render();
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (message && typeof message === 'object' && (message as { type?: string }).type === 'GM_LOCK') {
    void lockVault();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const change = changes[SESSION_STORAGE_KEY];
  if (areaName === 'session' && change && change.newValue === undefined) {
    void lockVault();
  }
});

void init();
