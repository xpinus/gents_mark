## Purpose

Manages the master password lifecycle and vault session locking so encrypted bookmarks can only be accessed after explicit authentication.

### Requirement: First-run password setup
The system SHALL require a master password before the vault can be used. The password SHALL be at least 8 characters, entered twice, and the user SHALL explicitly acknowledge that a forgotten password cannot be recovered.

#### Scenario: Valid password setup
- **WHEN** a user enters a matching password of at least 8 characters and confirms the non-recovery warning
- **THEN** the system creates password metadata and encrypted vault storage and shows the unlocked vault

#### Scenario: Rejected setup input
- **WHEN** passwords do not match or are shorter than 8 characters
- **THEN** the system rejects setup, creates no vault data, and shows an error

### Requirement: Unlock with master password
The system SHALL verify the entered password against stored verification data before revealing any vault content, and SHALL reveal no vault content when verification fails.

#### Scenario: Correct password
- **WHEN** a user enters the correct master password
- **THEN** the system derives the encryption key, decrypts the vault, and shows the vault contents

#### Scenario: Wrong password
- **WHEN** a user enters an incorrect password
- **THEN** the system rejects the attempt, shows an error, and reveals no vault content

### Requirement: Manual lock
The system SHALL provide a manual lock action that immediately ends the unlocked session.

#### Scenario: User locks the vault
- **WHEN** a user clicks the lock action while unlocked
- **THEN** the system clears the session key and in-memory plaintext and shows the lock screen

### Requirement: Automatic lock after inactivity
The system SHALL track user activity while the vault is open and SHALL lock the vault after a configurable inactivity threshold, defaulting to 5 minutes, without requesting the `idle` permission.

#### Scenario: Idle threshold reached
- **WHEN** no user interaction occurs for longer than the inactivity threshold
- **THEN** the system clears the session and shows the lock screen

#### Scenario: Activity resets the timer
- **WHEN** the user interacts with the popup before the threshold is reached
- **THEN** the system resets the inactivity timer

### Requirement: Session does not survive browser restart
The system SHALL keep the unlocked session in memory only and SHALL require re-authentication after a browser restart.

#### Scenario: Browser restart
- **WHEN** the browser restarts while the vault was unlocked
- **THEN** the next popup open shows the lock screen and requires the master password

### Requirement: Password is not recoverable
The system SHALL never store the master password or enough information to reconstruct it.

#### Scenario: Password forgotten
- **WHEN** a user forgets the master password
- **THEN** no recovery mechanism is available and vault data cannot be decrypted
