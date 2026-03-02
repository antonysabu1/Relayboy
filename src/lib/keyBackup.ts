/**
 * 🔐 Zero-Knowledge Key Backup Utility
 * 
 * Encrypts the user's Kyber private key with a Master Password
 * using PBKDF2 key derivation + AES-256-GCM encryption.
 * The Master Password never leaves the browser.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 32;
const IV_BYTES = 12;

function uint8ToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Derive an AES-256-GCM wrapping key from a master password and salt.
 */
async function deriveWrappingKey(
    masterPassword: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(masterPassword),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export interface EncryptedBackup {
    encryptedBlob: string; // Base64
    salt: string;          // Base64
    iv: string;            // Base64
}

/**
 * Encrypt a Base64-encoded private key with a master password.
 * Returns the encrypted blob, salt, and IV (all Base64).
 */
export async function encryptPrivateKey(
    privateKeyB64: string,
    masterPassword: string
): Promise<EncryptedBackup> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

    const wrappingKey = await deriveWrappingKey(masterPassword, salt);

    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        wrappingKey,
        encoder.encode(privateKeyB64)
    );

    return {
        encryptedBlob: uint8ToBase64(new Uint8Array(encrypted)),
        salt: uint8ToBase64(salt),
        iv: uint8ToBase64(iv),
    };
}

/**
 * Decrypt an encrypted private key backup using the master password.
 * Returns the original Base64-encoded private key.
 * Throws if the master password is wrong.
 */
export async function decryptPrivateKey(
    encryptedBlob: string,
    salt: string,
    iv: string,
    masterPassword: string
): Promise<string> {
    const wrappingKey = await deriveWrappingKey(masterPassword, base64ToUint8(salt));

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToUint8(iv) as BufferSource },
        wrappingKey,
        base64ToUint8(encryptedBlob) as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
