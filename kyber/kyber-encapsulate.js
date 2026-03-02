/**
 * 🔐 CRYSTALS-Kyber Encapsulation Module (JavaScript Version)
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
 * Optimized Encapsulation class
 */
export class KyberEncapsulator {
    constructor() {
        this.kem = new MlKem768();
    }

    /**
     * Lattice-Based Encapsulation
     * @param {Uint8Array} recipientPublicKey 
     */
    async encapsulate(recipientPublicKey) {
        console.log('🔐 Starting Lattice-Based Encapsulation...');
        const [ciphertext, sharedSecret] = await this.kem.encap(recipientPublicKey);
        console.log('✅ Lattice-based encapsulation successful!');
        return { ciphertext, sharedSecret };
    }

    resultToBase64(result) {
        return {
            ciphertext: uint8ArrayToBase64(result.ciphertext),
            sharedSecret: uint8ArrayToBase64(result.sharedSecret)
        };
    }
}

// Factory function
export function createEncapsulator() {
    return new KyberEncapsulator();
}
