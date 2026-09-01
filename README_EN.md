# 🎩 Gents' Mark

> *The discreet bookmark companion for gentlemen.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Edge Add-on](https://img.shields.io/badge/Microsoft_Edge-Add--on-0078D7?logo=microsoft-edge)](https://microsoftedge.microsoft.com/)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

**Gents' Mark** is a gentleman's bookmark encryption extension for Microsoft Edge. It safeguards your treasured digital fingerprints, keeping every browsing session elegant and undisturbed.

> Current status: core features are implemented. Build output is in `dist/`. Load it as an unpacked extension in Edge to try it out.

> ⚠️ **Important**: Uninstalling the extension will delete all local vault data, causing permanent loss of your bookmarks. Please **export a backup** or **click the Sync button** to sync the vault to the cloud before uninstalling. After reinstalling, you can restore via import or automatic cloud recovery.

## ✨ Core Features

- **🔐 The Vault**: AES-256-GCM encryption keeps your private bookmarks locked locally. The key is yours alone.
- **🕵️ Invisible Bookmarks**: Once locked into the vault, bookmarks vanish from Edge's native favorites — completely invisible to prying eyes.
- **📦 Local by Default**: All data is stored locally in your browser. Optional sync mode only transfers encrypted ciphertext (stored in your Edge account's chrome.storage.sync). Your treasures belong to you and you alone.
- **🌐 Bilingual**: Full support for Chinese (Simplified) and English, automatically following your browser language.

## 🚀 Quick Start

1. Install Gents' Mark from the Edge Add-ons store (link TBD).
2. Click the 🎩 icon in the browser toolbar and set your **master password** (memorize it carefully — passwords cannot be recovered).
3. Open the extension panel, browse the **bookmark picker**, select folders or bookmarks you want to protect, and click **"Lock Selected"**. You can also right-click any webpage and select **"Lock current page into vault"**.
4. To view your collection, click the 🎩 icon, enter your password, and browse your treasures.

## 🛠️ Technical Implementation

- **Encryption Standard**: [Web Cryptography API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) + AES-256-GCM
- **Key Derivation**: PBKDF2-SHA256 (600,000 iterations for key derivation, 1,000,000 for password verification), dual-salt design
- **Session Management**: AES-KW key wrapping; the unlocked key is stored in `chrome.storage.session` (in-memory, cleared on browser restart)
- **Auto-Lock**: Clears the session key after 5 minutes of inactivity, monitoring mouse/keyboard/focus events to refresh the timer
- **Storage**: `chrome.storage.local` by default (data stays local); optional `chrome.storage.sync` for encrypted snapshots
- **Backup & Restore**: Encrypted JSON file export/import with password verification on import
- **Permissions**: Only requests `bookmarks`, `storage`, `contextMenus`, and `activeTab` — no network access whatsoever

## 📐 Architecture

### Overview

- Manifest V3 extension, built with TypeScript + Vite + CRXJS
- Directory structure:
  ```
  src/
  ├── background/index.ts     # Service Worker: context menu, shortcuts, pending staging
  ├── popup/
  │   ├── index.html          # Popup entry point
  │   ├── main.ts             # Panel logic (setup/unlock/vault/picker/import-export/sync)
  │   ├── styles.css          # Panel styles
  │   └── icons/              # Inline SVG icons
  └── lib/
      ├── types.ts            # Domain types, interfaces, and constants
      ├── crypto.ts           # PBKDF2 + AES-256-GCM + AES-KW session wrapping
      ├── vault.ts            # Vault document CRUD, lock/restore/search
      ├── vault-document.ts   # Vault document validation and ID generation
      ├── bookmarks.ts        # Chrome native bookmark tree read/write wrapper
      ├── picker.ts           # Bookmark picker (check/search/count)
      ├── backup.ts           # Encrypted backup export/import
      ├── session.ts          # Session lifecycle (read/write/expiry/renewal)
      ├── secure-utils.ts     # Constant-time comparison, Base64, random bytes, memory wipe
      └── i18n.ts             # chrome.i18n.getMessage wrapper
  tests/                      # Vitest unit tests (mock chrome.* API)
  _locales/                   # zh_CN / en message bundles
  icons/                      # Extension icons (generated via scripts/generate-icons.ps1)
  ```

### Three Ways to Lock

| Method | Description |
|--------|-------------|
| **Bookmark Picker** | Browse/search native favorites in the extension panel, select folders or bookmarks, and lock them in batch |
| **Right-Click** | Right-click any page and select "Lock current page into vault"; the URL is staged in session storage, confirmed when you open the panel |
| **Shortcut** | `Alt+L` (Mac: `Cmd+Shift+L`) instantly locks the vault, clearing the session key |

### Encryption & Data Model

- The master password is derived via PBKDF2 (600,000 iterations for key derivation + random salt) into an AES-256-GCM key. Password verification uses a separate 1,000,000 iterations. Each encryption uses a new random IV.
- Each locked bookmark subtree is individually serialized to JSON and encrypted as a whole, hiding the directory structure.
- Local storage structure:
  - `vaultDocument`: version, dual salts, password verifier, encrypted item list
  - Each item: `{ id, createdAt, payload: { enc: "b64", iv, data } }`
  - `chrome.storage.session`: wrapped unlock key (AES-KW wrapped + original wrap key), cleared on browser restart
- Lock flow: serialize subtree → encrypt → write to vault → `removeTree` from native favorites
- Restore flow: decrypt → restore to original parent path (best effort); unfindable parents go into a "Gents' Mark Vault" folder
- Session restore: read wrapped key from `chrome.storage.session` → AES-KW unwrap → restore CryptoKey → no password re-entry needed

> ⚠️ Note: The deletions caused by locking propagate through Edge favorites sync. Encrypted content is local by default and invisible on other devices.

### Auto-Lock

- No `idle` permission required: `session.lastActivity` is recorded; 5-minute timeout checked on panel open or interaction
- `mousemove`, `mousedown`, `click`, `keydown`, `input`, `focus` events refresh the activity timestamp
- A 30-second interval timer checks for timeout and clears the session key
- Listens for `chrome.storage.session` changes (e.g., triggered by shortcut) to respond instantly to lock events

### Optional Sync

- Manually triggered: writes the entire vault document JSON to `chrome.storage.sync`, syncing across devices via your Edge account
- Password and session keys are never synced; other devices must install the same extension and enter the same master password to unlock
- Quota: ~100KB total; the extension warns if the vault exceeds this limit. Suitable for small-to-medium bookmark collections
- Auto-detection on first launch: if sync contains vault data and no local vault exists, it is pulled and restored

### Backup & Restore

- **Export**: One-click download of `gents-mark-backup.json`, containing the full vault document (encrypted items + metadata)
- **Import**: Select backup file → verify master password → confirm overwrite of current vault
- Format compatibility: the backup file is the JSON serialization of the vault document, suitable for cross-device migration

### Feature Checklist

| Feature | Status |
|---------|--------|
| Dual-salt PBKDF2 (600K key / 1M verify iterations) | ✅ |
| Session persistence (stay unlocked, AES-KW wrapping) | ✅ |
| Auto-lock (5-minute timeout, event monitoring) | ✅ |
| Native bookmark picker (folder tree + checkboxes + search + child count) | ✅ |
| Right-click staging flow (pending → open panel → confirm) | ✅ |
| Encrypted JSON backup/restore | ✅ |
| Shortcut lock (Alt+L) | ✅ |
| Bilingual (zh_CN / en) | ✅ |
| chrome.storage.sync optional sync | ✅ |

### Planned Features

- Duress password (a separate password that triggers full data wipe for emergency scenarios)
- Full-screen manager (dedicated tab for browsing the vault)
- Plaintext HTML export (requires master password re-entry)
- Change password (two-step write, crash-safe)
- Auto-lock inbox (drag into a specific folder to auto-encrypt)

## 📜 License

Released under the MIT License. You are free to use, modify, and distribute, provided the original copyright notice is retained.

---

## 🔒 Privacy Policy

Please read our [Privacy Policy](docs/index.html) to understand how this extension handles your data.

*Stay elegant. Stay private.*
