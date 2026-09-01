## Purpose

Provides the encrypted vault where locked bookmarks are browsed, opened, searched, restored, and deleted.

## ADDED Requirements

### Requirement: Lock native bookmarks into the vault
The system SHALL move a selected native bookmark or folder subtree into the vault by storing an encrypted copy and removing the original from the native bookmark tree.

#### Scenario: Locking a folder subtree
- **WHEN** a user locks a folder containing nested bookmarks and folders
- **THEN** the system stores one encrypted vault item preserving the hierarchy and removes the folder subtree from the native tree

#### Scenario: Locking a single bookmark
- **WHEN** a user locks a single bookmark
- **THEN** the system stores one encrypted vault item and removes the bookmark from the native tree

#### Scenario: Lock failure
- **WHEN** native removal fails after encryption succeeded
- **THEN** the system reports an error and does not leave the vault in a partially committed state

### Requirement: Browse the vault
The system SHALL display vault items as a tree when unlocked.

#### Scenario: Unlocked vault list
- **WHEN** the vault is unlocked and contains items
- **THEN** the user can see folders and bookmarks in a tree with titles

### Requirement: Search the vault
The system SHALL provide case-insensitive search across vault titles and URLs.

#### Scenario: Matching search query
- **WHEN** a user enters a search term
- **THEN** matching bookmarks and folders are shown and non-matching items are hidden

### Requirement: Open a vault bookmark
The system SHALL open a vault bookmark in a new browser tab without restoring it to the native tree.

#### Scenario: Opening a bookmark
- **WHEN** a user clicks open on a vault bookmark
- **THEN** the browser opens the URL in a new tab and the item remains in the vault

### Requirement: Restore vault items
The system SHALL restore a vault item back to the native bookmark tree, preferring its original parent folder and falling back to a dedicated vault folder, and SHALL remove the item from the vault after a successful restore.

#### Scenario: Original parent still exists
- **WHEN** a user restores an item whose original parent folder still exists
- **THEN** the system recreates the subtree under that parent and removes the item from the vault

#### Scenario: Original parent missing
- **WHEN** the original parent folder no longer exists
- **THEN** the system creates or reuses a "Gents' Mark 金库" folder and recreates the subtree there

### Requirement: Delete vault items permanently
The system SHALL permanently delete a selected vault item only after explicit confirmation, and SHALL not touch native bookmarks.

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of a vault item
- **THEN** the item is removed from the vault and cannot be restored

#### Scenario: Cancelled deletion
- **WHEN** a user cancels deletion
- **THEN** the item remains in the vault

### Requirement: Add a URL directly to the vault
The system SHALL allow adding a bookmark URL directly into the vault without an existing native bookmark, such as from the context-menu lock flow.

#### Scenario: Adding from the context menu
- **WHEN** a user confirms a pending page from the context-menu lock flow
- **THEN** the system adds an encrypted vault item with the page title and URL
