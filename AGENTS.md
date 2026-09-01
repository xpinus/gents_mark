# Repository Guidelines

## Project Structure & Module Organization

```
src/
├── background/       # Service worker (context menus, shortcuts, pending lock)
├── lib/              # Shared modules (crypto, vault, bookmarks, i18n, types)
│   ├── types.ts      # All domain types, interfaces, and constants
│   ├── crypto.ts     # PBKDF2 + AES-256-GCM encryption
│   ├── vault.ts      # Vault document model, lock/restore/delete
│   ├── bookmarks.ts  # Native Chrome bookmark tree wrappers
│   ├── i18n.ts       # chrome.i18n.getMessage helpers
│   └── secure-utils.ts  # Constant-time compare, base64, random bytes
└── popup/            # Extension popup UI (HTML, CSS, entry point)
tests/                # Vitest unit tests (mirrors src/lib/)
_locales/             # zh_CN and en message bundles
icons/                # Extension icons (generated via scripts/generate-icons.ps1)
scripts/              # Build helpers (icon generation, dist verification)
```

- New features go in `src/lib/` as pure modules; UI code goes in `src/popup/`.
- Keep Chrome API calls isolated to `src/lib/` wrappers (`bookmarks.ts`, `i18n.ts`) so tests can mock them.

## Build, Test, and Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR for the extension |
| `npm run build` | Type-check then produce a production `dist/` folder |
| `npm run typecheck` | Run `tsc --noEmit` to verify types only |
| `npm test` | Run all Vitest tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run verify` | Full CI check: typecheck + tests + dist artifact verification |
| `npm run icons` | Regenerate extension icons from source |

Always run `npm run verify` before opening a PR. The `dist/` folder is the loadable extension — load it as an unpacked extension in Edge or Chrome for manual testing.

## Coding Style & Naming Conventions

- **TypeScript** with `strict: true` and `noUncheckedIndexedAccess: true`. No implicit `any`.
- **Indentation**: 2 spaces (no tabs).
- **File names**: kebab-case (`secure-utils.ts`, `vault-document.ts`).
- **Variables & functions**: camelCase (`deriveEncryptionKey`, `wipeArray`).
- **Types & interfaces**: PascalCase (`VaultDocument`, `EncryptedPayload`). Prefer `interface` for objects, `type` for unions.
- **Constants**: SCREAMING_SNAKE_CASE (`VAULT_STORAGE_KEY`, `AUTO_LOCK_MS`).
- **Functions**: `export async function` for async operations; `export function` for sync helpers.
- No linter or formatter is configured yet — keep code consistent with existing patterns.

## Testing Guidelines

- **Framework**: [Vitest](https://vitest.dev/) with `environment: 'node'` and `globals: true`.
- Tests live in `tests/` and mirror the `src/lib/` module they cover (e.g., `tests/crypto.test.ts` ↔ `src/lib/crypto.ts`).
- Use `describe` / `it` blocks with descriptive names written in plain English.
- Mock Chrome extension APIs via `tests/helpers/chrome-mock.ts`.
- Aim for coverage of all crypto, vault, and bookmark operations. No hard percentage gate yet.

## Commit & Pull Request Guidelines

- **Commit style**: Follow the repo's existing pattern — concise, descriptive single-line messages. Adopt [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`) for new work.
- **PRs**: Keep them focused on one feature or fix. Include:
  - A brief description of what changed and why.
  - Screenshots or screen recordings if the UI (popup) changed.
  - Confirmation that `npm run verify` passes.
- Link related issues when applicable.

## Security & Architecture Notes

- This is a **Manifest V3 browser extension** (built with `@crxjs/vite-plugin`) targeting Microsoft Edge.
- **Encryption**: AES-256-GCM via Web Crypto API. PBKDF2 key derivation with separate salts for encryption (600K iterations) and password verification (1M iterations). Constant-time comparison for password hashes.
- **Permissions**: Minimal — only `bookmarks`, `storage`, `contextMenus`, and `activeTab`. No network access.
- Sensitive data (passwords, keys) is wiped from memory with `wipeArray` after use. Session keys are stored in `chrome.storage.session` (memory-only, cleared on browser restart).
- Never log or persist raw passwords or encryption keys.
