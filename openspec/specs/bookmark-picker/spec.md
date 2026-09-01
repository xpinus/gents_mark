## Purpose

Lets users browse and select existing native bookmarks and folders to move into the encrypted vault.

### Requirement: Show native bookmark tree
The system SHALL display the native bookmark tree in the popup, including the bookmark bar and other top-level folders.

#### Scenario: Picker opens
- **WHEN** a user opens the bookmark picker
- **THEN** all top-level native bookmark folders and bookmarks are visible

### Requirement: Select folders and bookmarks
The system SHALL allow selecting individual bookmarks and folders; selecting a folder SHALL include its entire subtree in the selection.

#### Scenario: Selecting a folder
- **WHEN** a user checks a folder
- **THEN** all nested bookmarks and folders under it are included in the selection

#### Scenario: Mixed selection
- **WHEN** a user checks multiple bookmarks and folders
- **THEN** the selection contains all checked items

### Requirement: Show folder item counts
The system SHALL show the number of bookmarks contained in each folder.

#### Scenario: Folder count display
- **WHEN** a folder contains bookmarks
- **THEN** its count is shown next to the folder name

### Requirement: Search native bookmarks
The system SHALL filter the picker tree by case-insensitive title and URL search.

#### Scenario: Searching
- **WHEN** a user types a search term
- **THEN** only matching bookmarks and their ancestor folders remain visible

### Requirement: Confirm locking selection
The system SHALL require a confirmation step before locking the selected items and SHALL report success or failure after completion.

#### Scenario: Confirming lock
- **WHEN** a user confirms the selected items
- **THEN** each selected subtree is locked into the vault and the picker shows success

#### Scenario: Cancelling
- **WHEN** a user cancels the picker
- **THEN** no native bookmarks are changed
