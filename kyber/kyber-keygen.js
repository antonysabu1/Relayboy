/**
 * 🔐 CRYSTALS-Kyber Key Generation Module (JavaScript Version)
 * 
 * Optimized for fast key generation during login/registration
 * Lattice-Based Module-LWE Cryptography (NOT ECDH)
 */

import { MlKem768 } from 'crystals-kyber-js';

// Utility functions (browser-compatible)
export function uint8ArrayToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Optimized Key Generation class
 */
export class KyberKeyGenerator {
    constructor() {
        this.kem = new MlKem768();
    }

    /**
     * Generate a new Lattice-Based Kyber key pair
     * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array}>}
     */
    async generateKeyPair() {
        console.log('🔐 Generating Lattice-Based Kyber key pair...');
        const [publicKey, privateKey] = await this.kem.generateKeyPair();
        console.log('✅ Lattice-based key pair generated successfully');
        return { publicKey, privateKey };
    }
}

// Factory function
export function createKeyGenerator() {
    return new KyberKeyGenerator();
}
