## Purpose

Encrypts and decrypts all vault content with a password-derived key so plaintext bookmark data never touches extension storage.

### Requirement: AES-256-GCM encryption
The system SHALL encrypt all vault content with AES-256-GCM using a unique random 12-byte IV for every encryption operation.

#### Scenario: Encrypting vault content
- **WHEN** a vault item is saved
- **THEN** the stored payload contains the IV, ciphertext, and a format marker, and no plaintext title or URL is written to storage

#### Scenario: Decrypting with the correct key
- **WHEN** the correct key and IV are available
- **THEN** decryption returns the original plaintext

#### Scenario: Decryption failure
- **WHEN** decryption fails due to a wrong key or corrupted data
- **THEN** the system reports an error and discards the partial result

### Requirement: PBKDF2 key derivation with unique salts
The system SHALL derive the AES key with PBKDF2-SHA256 using a random per-vault salt, and SHALL verify the password using a separate random salt and a constant-time comparison.

#### Scenario: Two vaults with the same password
- **WHEN** two independent vaults are created with the same master password
- **THEN** their encryption salts and derived keys differ

### Requirement: Versioned storage format
The system SHALL store vault metadata and encrypted payloads with a schema version and an explicit format marker so future versions can migrate.

#### Scenario: Reading stored data
- **WHEN** the extension loads stored vault data
- **THEN** it validates the version and format marker before decrypting
