## Purpose

Lets users lock the current page or a link into the vault directly from the browser context menu.

## ADDED Requirements

### Requirement: Context menu entries
The system SHALL provide context menu items for pages and links that capture the URL and page title.

#### Scenario: Page context menu
- **WHEN** a user right-clicks a web page and chooses the lock entry
- **THEN** the system captures the page URL and title and opens the extension popup

#### Scenario: Link context menu
- **WHEN** a user right-clicks a link and chooses the lock entry
- **THEN** the system captures the link URL and the page title and opens the extension popup

#### Scenario: Unsupported URL
- **WHEN** the captured URL is not http(s)
- **THEN** the system ignores the request without opening the popup

### Requirement: Pending item survives popup reopen
The system SHALL store the pending page in `chrome.storage.session` and present it in the popup so it survives popup close and reopening within the browser session.

#### Scenario: Popup closed before confirming
- **WHEN** the popup closes before the user confirms the pending item
- **THEN** reopening the popup shows the pending item again

#### Scenario: Pending item resolved
- **WHEN** the user confirms or cancels the pending item
- **THEN** the pending item is cleared

### Requirement: Confirm before locking
The system SHALL require confirmation of title and URL before adding the page to the vault, and SHALL require the vault to be unlocked.

#### Scenario: Unlocked confirmation
- **WHEN** the vault is unlocked and the user confirms the pending page
- **THEN** the page is added to the vault as a bookmark

#### Scenario: Locked popup
- **WHEN** the popup is locked when a pending item arrives
- **THEN** the popup shows the lock screen first and presents the pending item after unlock
