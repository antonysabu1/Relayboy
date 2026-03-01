/**
 * 🔐 Quantum-Safe E2E Encryption Module (Browser)
 * Full Symmetric Ratchet with AES-256-GCM
 * Ported from Python quantum_encryption_module.py / quantum_decryption_module.py
 *
 * Features:
 * - HKDF-based symmetric ratchet (forward secrecy per message)
 * - AES-256-GCM authenticated encryption
 * - Random padding to hide message length
 * - Encrypted metadata headers inside ciphertext
 * - Beacon-based key identification
 * - Two independent chains per conversation (one per direction)
 */

// --- Constants ---
const AES_KEY_SIZE = 32;
const NONCE_SIZE = 12;
const BEACON_SIZE = 16;
const PAD_BLOCK_SIZE = 256; // Pad to next multiple of this
const HKDF_INFO = "AES-GCM-256-ZERO-METADATA";
const RATCHET_INFO_CHAIN = "RATCHET-CHAIN-KEY";
const RATCHET_INFO_MSG = "RATCHET-MESSAGE-KEY";
const BEACON_INFO = "MESSAGE-LOOKUP-ID";

// Encrypted message prefix for identification
const ENC_PREFIX = "QE1:";

// --- Mutex for Serializing Ratchet Operations ---
class Mutex {
    private queue: Promise<void> = Promise.resolve();

    async lock(): Promise<() => void> {
        let release: () => void;
        const waiting = new Promise<void>((resolve) => {
            release = resolve;
        });
        const lock = this.queue.then(() => release);
        this.queue = this.queue.then(() => waiting);
        return lock;
    }
}

// --- Utility Functions ---

function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * HKDF key derivation using Web Crypto API.
 * Mirrors PyCryptodome's HKDF(master, key_len, salt=None, hashmod=SHA256, context=info)
 */
async function hkdfDerive(
    inputKeyMaterial: Uint8Array,
    lengthBytes: number,
    info: string
): Promise<Uint8Array> {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        inputKeyMaterial as unknown as BufferSource,
        "HKDF",
        false,
        ["deriveBits"]
    );
    const derived = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: new Uint8Array(0),
            info: new TextEncoder().encode(info),
        },
        baseKey,
        lengthBytes * 8
    );
    return new Uint8Array(derived);
}

// --- Ratchet Chain ---

class RatchetChain {
    private chainKey: Uint8Array;
    private step: number;

    constructor(initialKey: Uint8Array) {
        this.chainKey = new Uint8Array(initialKey);
        this.step = 0;
    }

    /**
     * Advance the chain: derive a message key and update chain key.
     * Mirrors Python's _advance_message_key()
     */
    async advance(): Promise<{ msgKey: Uint8Array; step: number }> {
        const msgKey = await hkdfDerive(this.chainKey, AES_KEY_SIZE, RATCHET_INFO_MSG);
        const newChain = await hkdfDerive(this.chainKey, AES_KEY_SIZE, RATCHET_INFO_CHAIN);
        this.chainKey = newChain;
        this.step++;
        return { msgKey, step: this.step };
    }

    get currentStep(): number {
        return this.step;
    }
}

// --- Core Encrypt/Decrypt ---

/**
 * Encrypt plaintext with a message key.
 * Format: beacon(16) + nonce(12) + ciphertext_with_tag(variable)
 * Internal payload: hdr_len(4) + header + msg_len(4) + message + random_padding
 */
async function encryptWithMsgKey(
    msgKey: Uint8Array,
    plaintext: Uint8Array,
    senderId: string,
    step: number
): Promise<Uint8Array> {
    const encoder = new TextEncoder();

    // 1. Build encrypted header (metadata hidden inside ciphertext)
    const header = JSON.stringify({
        s: senderId,
        n: step,
        t: Math.floor(Date.now() / 1000),
        i: Array.from(crypto.getRandomValues(new Uint8Array(4)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
    });
    const headerBytes = encoder.encode(header);

    // 2. Pack: hdr_len(4) + header + msg_len(4) + message
    const content = new Uint8Array(4 + headerBytes.length + 4 + plaintext.length);
    const view = new DataView(content.buffer, content.byteOffset, content.byteLength);
    view.setUint32(0, headerBytes.length);
    content.set(headerBytes, 4);
    view.setUint32(4 + headerBytes.length, plaintext.length);
    content.set(plaintext, 4 + headerBytes.length + 4);

    // 3. Pad to next multiple of PAD_BLOCK_SIZE (hide message length)
    const paddedSize = Math.max(
        PAD_BLOCK_SIZE,
        Math.ceil(content.length / PAD_BLOCK_SIZE) * PAD_BLOCK_SIZE
    );
    const padded = new Uint8Array(paddedSize);
    padded.set(content);
    if (paddedSize > content.length) {
        const randomPad = crypto.getRandomValues(
            new Uint8Array(paddedSize - content.length)
        );
        padded.set(randomPad, content.length);
    }

    // 4. Derive AES key from message key via HKDF
    const aesKeyBytes = await hkdfDerive(msgKey, AES_KEY_SIZE, HKDF_INFO);
    const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyBytes as unknown as BufferSource,
        "AES-GCM",
        false,
        ["encrypt"]
    );

    // 5. Derive beacon (blinded identifier for key lookup)
    const beacon = await hkdfDerive(msgKey, BEACON_SIZE, BEACON_INFO);

    // 6. Encrypt with AES-256-GCM (Web Crypto appends 16-byte tag to ciphertext)
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce },
        aesKey,
        padded
    );

    // 7. Package: beacon(16) + nonce(12) + encrypted(ciphertext+tag)
    const result = new Uint8Array(
        BEACON_SIZE + NONCE_SIZE + encrypted.byteLength
    );
    result.set(beacon, 0);
    result.set(nonce, BEACON_SIZE);
    result.set(new Uint8Array(encrypted), BEACON_SIZE + NONCE_SIZE);

    return result;
}

/**
 * Decrypt an encrypted package with a message key.
 * Extracts and returns the plaintext message (discards header and padding).
 */
async function decryptWithMsgKey(
    msgKey: Uint8Array,
    encPackage: Uint8Array
): Promise<string> {
    // 1. Extract parts (skip beacon — it was used for lookup)
    const nonce = encPackage.slice(BEACON_SIZE, BEACON_SIZE + NONCE_SIZE);
    const ciphertextWithTag = encPackage.slice(BEACON_SIZE + NONCE_SIZE);

    // 2. Derive AES key
    const aesKeyBytes = await hkdfDerive(msgKey, AES_KEY_SIZE, HKDF_INFO);
    const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyBytes as unknown as BufferSource,
        "AES-GCM",
        false,
        ["decrypt"]
    );

    // 3. Decrypt (Web Crypto verifies the GCM tag automatically)
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce },
        aesKey,
        ciphertextWithTag
    );
    const payload = new Uint8Array(decrypted);

    // 4. Unpack: hdr_len(4) + header + msg_len(4) + message + padding(discarded)
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const hdrLen = view.getUint32(0);
    const msgStart = 4 + hdrLen;
    const msgLen = view.getUint32(msgStart);
    const message = payload.slice(msgStart + 4, msgStart + 4 + msgLen);

    return new TextDecoder().decode(message);
}

// --- Crypto Session ---

/**
 * Manages two ratchet chains for a conversation between two users.
 * - sendChain: for encrypting outgoing messages
 * - recvChain: for decrypting incoming messages
 *
 * Chains are derived from the shared secret using deterministic direction
 * based on alphabetical username ordering, so both users derive identical chains.
 */
export class CryptoSession {
    private sendChain: RatchetChain;
    private recvChain: RatchetChain;
    private myUsername: string;
    private peerUsername: string;
    private sendMutex: Mutex = new Mutex();
    private recvMutex: Mutex = new Mutex();

    private constructor(
        sendChain: RatchetChain,
        recvChain: RatchetChain,
        myUsername: string,
        peerUsername: string
    ) {
        this.sendChain = sendChain;
        this.recvChain = recvChain;
        this.myUsername = myUsername;
        this.peerUsername = peerUsername;
    }

    /**
     * Create a new CryptoSession from a Kyber shared secret.
     * Both users calling this with the same shared secret will get matching chains.
     */
    static async create(
        sharedSecretBase64: string,
        myUsername: string,
        peerUsername: string
    ): Promise<CryptoSession> {
        const sharedSecret = fromBase64(sharedSecretBase64);

        // Force lowercase for deterministic chain derivation
        const myLower = myUsername.toLowerCase();
        const peerLower = peerUsername.toLowerCase();

        // Deterministic direction: alphabetically first user = direction A
        const sorted = [myLower, peerLower].sort();
        const chainAKey = await hkdfDerive(
            sharedSecret,
            AES_KEY_SIZE,
            `CHAIN-${sorted[0]}-TO-${sorted[1]}`
        );
        const chainBKey = await hkdfDerive(
            sharedSecret,
            AES_KEY_SIZE,
            `CHAIN-${sorted[1]}-TO-${sorted[0]}`
        );

        const chainA = new RatchetChain(chainAKey);
        const chainB = new RatchetChain(chainBKey);

        // My send chain = chain in my→peer direction
        // My recv chain = chain in peer→my direction
        if (myLower === sorted[0]) {
            return new CryptoSession(chainA, chainB, myLower, peerLower);
        } else {
            return new CryptoSession(chainB, chainA, myLower, peerLower);
        }
    }

    /**
     * Encrypt a plaintext message for sending.
     * Returns base64 encoded encrypted payload (without QE1: prefix).
     */
    async encrypt(plaintext: string): Promise<string> {
        const release = await this.sendMutex.lock();
        try {
            const encoder = new TextEncoder();
            const { msgKey, step } = await this.sendChain.advance();
            console.debug(`📤 [Crypto] Encrypting message at step ${step} for ${this.peerUsername}`);
            const encrypted = await encryptWithMsgKey(
                msgKey,
                encoder.encode(plaintext),
                this.myUsername,
                step
            );
            return toBase64(encrypted);
        } finally {
            release();
        }
    }

    /**
     * Decrypt an incoming real-time message.
     * Input: base64 encoded encrypted payload (without QE1: prefix).
     */
    async decrypt(encryptedBase64: string): Promise<string> {
        const release = await this.recvMutex.lock();
        try {
            const encrypted = fromBase64(encryptedBase64);
            const { msgKey, step } = await this.recvChain.advance();
            console.debug(`📥 [Crypto] Decrypting message at step ${step} from ${this.peerUsername}`);
            return await decryptWithMsgKey(msgKey, encrypted);
        } finally {
            release();
        }
    }

    /**
     * Decrypt all messages in a history batch.
     * Messages MUST be in chronological order (ascending timestamp).
     * This method advances both chains correctly based on message direction.
     *
     * Call this on a FRESH session (just created from shared secret).
     */
    async decryptHistory(
        messages: Array<{
            from: string;
            message: string;
            timestamp: string;
            is_seen?: boolean;
        }>
    ): Promise<
        Array<{
            from: string;
            message: string;
            timestamp: string;
            is_seen?: boolean;
        }>
    > {
        console.debug(`📜 [Crypto] Replaying history for ${this.peerUsername} (${messages.length} messages)`);

        // Acquire BOTH locks for the entire duration of history replay to ensure atomicity
        const releaseSend = await this.sendMutex.lock();
        const releaseRecv = await this.recvMutex.lock();

        try {
            const decrypted: typeof messages = [];

            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                try {
                    // Check if message is encrypted
                    if (!isEncryptedMessage(msg.message)) {
                        decrypted.push(msg);
                        continue;
                    }

                    // Strip prefix and decode
                    const payload = msg.message.slice(ENC_PREFIX.length);
                    const encData = fromBase64(payload);

                    // Determine which chain based on sender (Case-insensitive)
                    const isMine = msg.from.toLowerCase() === this.myUsername;
                    const chain = isMine ? this.sendChain : this.recvChain;

                    // Advance chain and decrypt (Sequential, no inner wait for locks)
                    const { msgKey, step } = await chain.advance();

                    try {
                        const plaintext = await decryptWithMsgKey(msgKey, encData);
                        decrypted.push({
                            ...msg,
                            message: plaintext,
                        });
                    } catch (innerErr) {
                        console.error(`❌ [Crypto] Decryption failed at step ${step} for message ${i}:`, innerErr);
                        decrypted.push({
                            ...msg,
                            message: "🔒 [Decryption Failed]",
                        });
                    }
                } catch (err) {
                    console.error(`❌ [Crypto] Error processing history message ${i}:`, err);
                    decrypted.push({
                        ...msg,
                        message: "🔒 [Format Error]",
                    });
                }
            }

            return decrypted;
        } finally {
            releaseSend();
            releaseRecv();
        }
    }
}

/**
 * Check if a message string is an encrypted payload.
 */
export function isEncryptedMessage(message: string): boolean {
    return message.startsWith(ENC_PREFIX);
}

/**
 * Wrap an encrypted base64 payload with the QE1: prefix for storage/transport.
 */
export function wrapEncrypted(base64Payload: string): string {
    return ENC_PREFIX + base64Payload;
}

export { ENC_PREFIX };
