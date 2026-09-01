## Context

The repo currently contains only README 方案 and an OpenSpec scaffold; there is no production code. The README documents the v0.1 architecture, key interaction trade-offs, and borrowable patterns from Holy Private Bookmarks. The user additionally chose TypeScript, so the "no build chain" note in the README is superseded for v0.1. See proposal.md for the motivation and scope.

## Goals / Non-Goals

**Goals:**

- Deliver an installable Manifest V3 Edge extension built with TypeScript and a reproducible build.
- Cover the v0.1 loop: password setup/unlock/lock, auto-lock session, bookmark picker lock, context-menu pending flow, vault browse/search/open/restore/delete, and encrypted backup.
- Keep permissions minimal (`bookmarks`, `storage`, `contextMenus`, `activeTab`) with no network access.

**Non-Goals:**

- Optional `chrome.storage.sync` vault sync, duress password, stay-unlocked opt-in, HTML import/export, full-screen manager, drag-drop, and favicon loading.
- System-level idle detection (`idle` permission).
- Multi-language support beyond Chinese and English.

## Decisions

### Build tooling: TypeScript + Vite + CRXJS

Use Vite with `@crxjs/vite-plugin` (v2.x, which supports Vite 3-8) so popup HTML, service worker, and static assets are bundled and the manifest output paths are rewritten automatically. Manifest is declared with `defineManifest` in `manifest.config.ts`.

Alternative: a hand-written Vite multi-entry build plus a copy script. It avoids a plugin dependency but requires manual manifest path rewriting and is more error-prone. WXT was considered but adds a framework layer we do not need for a popup-only extension.

### Storage schema: single versioned vault document

Store one key in `chrome.storage.local`:

```ts
interface VaultDocument {
  version: 1;
  encryptionSalt: string; // base64, 32 bytes
  hashSalt: string;       // base64, 16 bytes
  passwordHash: string;   // base64, 256 bits
  keyIterations: number;
  hashIterations: number;
  items: VaultItem[];
}

interface VaultItem {
  id: string;
  createdAt: number;
  payload: { enc: 'b64'; iv: string; data: string };
}
```

Each lock operation serializes one bookmark subtree (including original parent path and dates) and stores it as one encrypted `VaultItem`. This hides folder structure from storage and makes backup/import a single-document operation. The password verifier is a separate PBKDF2 hash rather than an encrypted known-plaintext blob.

### Crypto parameters

- AES-256-GCM with random 12-byte IV per encryption.
- PBKDF2-SHA256: 600,000 iterations for the AES key, 1,000,000 iterations for the password hash; separate random salts (32-byte encryption salt, 16-byte hash salt).
- Constant-time comparison for password verification; base64 payloads with an explicit `enc: 'b64'` marker for forward compatibility.
- README's "100,000 iterations" line will be updated to match.

### Session model without stay-unlocked toggle

On unlock, wrap an extractable AES key copy with a per-session AES-KW wrapping key and store `{ wrappedKey, wrapKeyRaw, salt, lastActivity }` in `chrome.storage.session`. On popup open, restore only if `lastActivity` is within the inactivity threshold; otherwise clear the session and require the password. A manual lock or the `Alt+L` command clears the session immediately. Session storage is memory-only, so browser restart always requires re-authentication.

### Context-menu pending flow

The background service worker creates one context menu entry for `page` and `link` contexts. On click it writes `{ url, title }` to `chrome.storage.session` and opens the popup via `chrome.action.openPopup()`, falling back to opening `popup.html` in a tab. The popup shows a pending-item banner before or after unlock, then asks for confirmation before adding the entry to the vault. Non-http(s) URLs are ignored. `activeTab` is used to read the page title.

### Vault operations

- Lock: serialize subtree -> encrypt -> append `VaultItem` -> write storage -> remove native subtree with `removeTree` (or `remove` for a single bookmark). If removal fails, roll back the written item.
- Restore: decrypt -> resolve original parent path from stored metadata, creating missing folders if needed -> recreate nodes with `chrome.bookmarks.create` -> remove the `VaultItem` after success. Restored nodes get new native IDs, which is acceptable.
- Open: `chrome.tabs.create({ url })`; no `tabs` permission needed.
- Search: case-insensitive substring match over decrypted titles and URLs, rendered as a filtered tree.
- Backup import: validate document shape/version, verify password against the imported hash, ask for confirmation, then write through a staging key before swapping, so a failed import leaves the current vault untouched.

### Popup architecture

Vanilla TypeScript with DOM rendering helpers and a small view-state machine (`setup` / `locked` / `unlocked`). Sections: lock screen, vault tree, bookmark picker modal, pending-item banner, and a minimal settings area for lock and backup. Popup width stays around 380px.

### Testing

Vitest with a mocked `chrome` API surface and Node's Web Crypto for unit tests of crypto, storage format, vault operations, and picker selection logic. Build verification is `npm run build`, followed by manual "load unpacked" testing in Edge.

## Risks / Trade-offs

- [CRXJS/Vite version drift] -> Pin exact versions in `package.json`; if the plugin misbehaves, fall back to a custom multi-entry Vite build with a manifest copy script.
- [PBKDF2 at 600k/1M iterations is slow] -> Show a loading state during setup/unlock; these are infrequent operations.
- [Native bookmark deletion syncs to other devices] -> Show a clear warning in the picker confirmation and README; the vault item is the source of truth.
- [AES-KW wrapping key stored beside the wrapped key in session storage] -> The threat model is same-browser-session profile access; the defense is convenience-grade, documented in code comments.
- [Restore changes native bookmark IDs] -> Acceptable; parent path resolution is best-effort and falls back to a dedicated vault folder.

## Migration Plan

v0.1 is greenfield; there is no legacy data to migrate. Deployment is "load unpacked" during development, then a zipped package for Edge Add-ons later. Rolling back means uninstalling the extension; already-locked bookmarks remain removed from the native tree and exist only in the vault, which the confirmation UI must state clearly.

## Open Questions

- Exact CRXJS manifest config syntax will be validated during apply; if incompatible with the installed Vite version, the fallback build approach is the backstop.
- Edge Add-ons packaging details (screenshots, store copy, zip layout) are deferred to the final milestone.
