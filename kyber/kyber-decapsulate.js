/**
 * 🔐 CRYSTALS-Kyber Decapsulation Module (JavaScript Version)
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
 * Optimized Decapsulation class
 */
export class KyberDecapsulator {
    constructor() {
        this.kem = new MlKem768();
    }

    /**
     * Lattice-Based Decapsulation
     * @param {Uint8Array} ciphertext 
     * @param {Uint8Array} privateKey 
     */
    async decapsulate(ciphertext, privateKey) {
        console.log('🔓 Starting Lattice-Based Decapsulation...');
        const sharedSecret = await this.kem.decap(ciphertext, privateKey);
        console.log('✅ Lattice-based decapsulation successful!');
        return sharedSecret;
    }
}

// Factory function
export function createDecapsulator() {
    return new KyberDecapsulator();
}
