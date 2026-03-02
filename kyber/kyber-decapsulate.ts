/**
 * 🔐 CRYSTALS-Kyber Decapsulation Module
 * 
 * Optimized for fast decapsulation operations
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

export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Optimized Decapsulation class
export class KyberDecapsulator {
  private kem: MlKem768;

  constructor() {
    // 🏗️ CRYSTALS-Kyber: Lattice-based Module-LWE KEM
    // ❌ NOT ECDH: No elliptic curves, no discrete logarithms
    // ✅ Post-Quantum: Secure against quantum computers
    this.kem = new MlKem768();
  }

  /**
   * Lattice-Based Decapsulation using Module-LWE
   * Optimized for performance during message receiving
   * @param ciphertext - The received lattice-based ciphertext
   * @param privateKey - The recipient's lattice-based private key
   * @returns Promise<Uint8Array> - The shared secret
   */
  async decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    console.log('🔓 Starting Lattice-Based Decapsulation...');
    console.log('⚠️  Using CRYSTALS-Kyber Module-LWE (NOT ECDH)');
    console.log(`📥 Using lattice-based ciphertext of length: ${ciphertext.length} bytes`);
    console.log(`🔐 Using lattice-based private key of length: ${privateKey.length} bytes`);

    const sharedSecret = await this.kem.decap(ciphertext, privateKey);

    console.log('✅ Lattice-based decapsulation successful!');
    console.log(`🔑 Shared secret length: ${sharedSecret.length} bytes`);

    return sharedSecret;
  }

  /**
   * Convert shared secret to Base64 for storage
   * @param sharedSecret - The shared secret bytes
   * @returns string - Base64 encoded shared secret
   */
  sharedSecretToBase64(sharedSecret: Uint8Array): string {
    return uint8ArrayToBase64(sharedSecret);
  }

  /**
   * Verify that two shared secrets match
   * @param secret1 - First shared secret
   * @param secret2 - Second shared secret
   * @returns boolean - True if secrets match
   */
  verifySharedSecret(secret1: Uint8Array, secret2: Uint8Array): boolean {
    const match = arraysEqual(secret1, secret2);
    console.log(`🔍 Verifying shared secrets match: ${match ? '✅ YES' : '❌ NO'}`);
    return match;
  }

  /**
   * Verify shared secret from Base64 strings
   * @param mySecretBase64 - My shared secret in Base64
   * @param theirSecretBase64 - Their shared secret in Base64
   * @returns boolean - True if secrets match
   */
  verifySharedSecretFromBase64(mySecretBase64: string, theirSecretBase64: string): boolean {
    const mySecret = base64ToUint8Array(mySecretBase64);
    const theirSecret = base64ToUint8Array(theirSecretBase64);
    return this.verifySharedSecret(mySecret, theirSecret);
  }

  /**
   * Get information about the decapsulation process
   */
  getInfo(): object {
    return {
      algorithm: 'ML-KEM768 (CRYSTALS-Kyber)',
      type: '🏗️ LATTICE-BASED (Module-LWE)',
      operation: 'Decapsulation',
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
export function createDecapsulator(): KyberDecapsulator {
  return new KyberDecapsulator();
}

// Export the MlKem768 class for direct use if needed
export { MlKem768 };
