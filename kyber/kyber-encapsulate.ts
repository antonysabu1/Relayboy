/**
 * 🔐 CRYSTALS-Kyber Encapsulation Module
 * 
 * Optimized for fast encapsulation operations
 * Lattice-Based Module-LWE Cryptography (NOT ECDH)
 */

import { MlKem768 } from 'crystals-kyber-js';

// Utility functions (browser-compatible)
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Encapsulation result interface
export interface EncapsulationResult {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}

// Optimized Encapsulation class
export class KyberEncapsulator {
  private kem: MlKem768;

  constructor() {
    // 🏗️ CRYSTALS-Kyber: Lattice-based Module-LWE KEM
    // ❌ NOT ECDH: No elliptic curves, no discrete logarithms
    // ✅ Post-Quantum: Secure against quantum computers
    this.kem = new MlKem768();
  }

  /**
   * Lattice-Based Encapsulation using Module-LWE
   * Optimized for performance during message sending
   * @param recipientPublicKey - The recipient's lattice-based public key
   * @returns Promise<EncapsulationResult> - Ciphertext and shared secret
   */
  async encapsulate(recipientPublicKey: Uint8Array): Promise<EncapsulationResult> {
    console.log('🔐 Starting Lattice-Based Encapsulation...');
    console.log('⚠️  Using CRYSTALS-Kyber Module-LWE (NOT ECDH)');
    console.log(`📥 Using lattice-based public key of length: ${recipientPublicKey.length} bytes`);

    const [ciphertext, sharedSecret] = await this.kem.encap(recipientPublicKey);

    console.log('✅ Lattice-based encapsulation successful!');
    console.log(`📦 Ciphertext length: ${ciphertext.length} bytes (vs ~32 bytes for ECDH)`);
    console.log(`🔑 Shared secret length: ${sharedSecret.length} bytes`);

    return { ciphertext, sharedSecret };
  }

  /**
   * Convert encapsulation result to Base64 for transmission
   * @param result - The encapsulation result
   * @returns { ciphertext: string; sharedSecret: string } - Base64 encoded results
   */
  resultToBase64(result: EncapsulationResult): { ciphertext: string; sharedSecret: string } {
    return {
      ciphertext: uint8ArrayToBase64(result.ciphertext),
      sharedSecret: uint8ArrayToBase64(result.sharedSecret)
    };
  }

  /**
   * Get information about the encapsulation process
   */
  getInfo(): object {
    return {
      algorithm: 'ML-KEM768 (CRYSTALS-Kyber)',
      type: '🏗️ LATTICE-BASED (Module-LWE)',
      operation: 'Encapsulation',
      securityLevel: '🛡️ Post-Quantum Secure (NIST Level 3)',
      warning: '⚠️  NOT ECDH - No elliptic curves!',
      ciphertextSize: 1088, // bytes (vs 32-64 for ECDH)
      sharedSecretSize: 32, // bytes
      nistLevel: 3,
      quantumResistant: true,
      mathematicalBasis: 'Module Learning With Errors (LWE) over lattices',
      comparison: {
        ecdhCiphertext: '32-64 bytes',
        kyberCiphertext: '1088 bytes'
      }
    };
  }
}

// Factory function for easy instantiation
export function createEncapsulator(): KyberEncapsulator {
  return new KyberEncapsulator();
}

// Export the MlKem768 class for direct use if needed
export { MlKem768 };
