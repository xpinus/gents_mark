import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extensionName__',
  version: '0.1.0',
  description: '__MSG_extensionDescription__',
  default_locale: 'zh_CN',
  permissions: ['bookmarks', 'storage', 'contextMenus', 'activeTab'],
  commands: {
    lockVault: {
      suggested_key: {
        default: 'Alt+L',
        mac: 'Command+Shift+L'
      },
      description: '__MSG_commandLock__'
    }
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png'
  }
});
