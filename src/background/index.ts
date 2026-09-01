import { PENDING_KEY, SESSION_STORAGE_KEY } from '../lib/types';

const MENU_ID = 'lock-to-vault';

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

async function openPopupOrTab(): Promise<void> {
  try {
    await chrome.action.openPopup();
  } catch {
    const popupPath = chrome.runtime.getManifest().action?.default_popup;
    const fallback = popupPath ? chrome.runtime.getURL(popupPath) : chrome.runtime.getURL('index.html');
    await chrome.tabs.create({ url: fallback });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: chrome.i18n.getMessage('contextMenuLock'),
    contexts: ['page', 'link', 'frame']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = info.linkUrl || info.pageUrl;
  if (!url || !isHttpUrl(url)) return;
  const title = tab?.title || new URL(url).hostname;
  await chrome.storage.session.set({
    [PENDING_KEY]: { url, title: title.slice(0, 200) }
  });
  await openPopupOrTab();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'lockVault') return;
  await chrome.storage.session.remove(SESSION_STORAGE_KEY);
  try {
    await chrome.runtime.sendMessage({ type: 'GM_LOCK' });
  } catch {
    // No popup is listening; clearing the session is enough.
  }
});
