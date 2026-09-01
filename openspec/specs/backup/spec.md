## Purpose

Allows users to export and import encrypted vault backups so data can be moved between browsers or recovered after a reinstall.

### Requirement: Export encrypted backup
The system SHALL export a single JSON file containing the versioned vault metadata and encrypted items, with no plaintext titles or URLs.

#### Scenario: Successful export
- **WHEN** a user exports a backup while unlocked
- **THEN** a JSON file downloads containing only encrypted vault data

### Requirement: Import backup
The system SHALL import a backup only after validating its format and verifying the master password, and SHALL not modify the current vault on failure.

#### Scenario: Valid import
- **WHEN** a user imports a valid backup and enters the correct password
- **THEN** the current vault is replaced by the imported vault

#### Scenario: Invalid format
- **WHEN** the selected file is not a recognized backup format
- **THEN** the system rejects it and the current vault is unchanged

#### Scenario: Wrong password on import
- **WHEN** the file format is valid but the password is wrong
- **THEN** the system rejects the import and the current vault is unchanged

### Requirement: Confirmation before replacing vault
The system SHALL ask for explicit confirmation before replacing the current vault with an imported backup.

#### Scenario: Cancelled import
- **WHEN** a user cancels the import confirmation
- **THEN** the current vault is unchanged
