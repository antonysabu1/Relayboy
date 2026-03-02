/**
 * 🔐 CRYSTALS-Kyber Key Generation Module
 * 
 * Optimized for fast key generation during login
 * Lattice-Based Module-LWE Cryptography (NOT ECDH)
 */

import { MlKem768 } from 'crystals-kyber-js';

// Utility functions
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

// Key Pair interface
export interface KyberKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

// Optimized Key Generation class
export class KyberKeyGenerator {
  private kem: MlKem768;

  constructor() {
    // 🏗️ CRYSTALS-Kyber: Lattice-based Module-LWE KEM
    // ❌ NOT ECDH: No elliptic curves, no discrete logarithms
    // ✅ Post-Quantum: Secure against quantum computers
    this.kem = new MlKem768();
  }

  /**
   * Generate a new Lattice-Based Kyber key pair
   * Optimized for performance during login
   * @returns Promise<KyberKeyPair> - Public and private keys
   */
  async generateKeyPair(): Promise<KyberKeyPair> {
    console.log('🔐 Generating Lattice-Based Kyber key pair...');
    console.log('⚠️  This is CRYSTALS-Kyber (Module-LWE), NOT ECDH');

    const [publicKey, privateKey] = await this.kem.generateKeyPair();

    console.log('✅ Lattice-based key pair generated successfully');
    console.log(`📤 Public key length: ${publicKey.length} bytes (vs ~32 bytes for ECDH)`);
    console.log(`🔐 Private key length: ${privateKey.length} bytes (vs ~32 bytes for ECDH)`);

    return { publicKey, privateKey };
  }

  /**
   * Get information about the Lattice-Based Kyber parameters
   */
  getInfo(): object {
    return {
      algorithm: 'ML-KEM768 (CRYSTALS-Kyber)',
      type: '🏗️ LATTICE-BASED (Module-LWE)',
      securityLevel: '🛡️ Post-Quantum Secure (NIST Level 3)',
      warning: '⚠️  NOT ECDH - No elliptic curves!',
      publicKeySize: 1184, // bytes (vs 32-64 for ECDH)
      privateKeySize: 2400, // bytes (vs ~32 for ECDH)
      sharedSecretSize: 32, // bytes
      nistLevel: 3,
      quantumResistant: true,
      mathematicalBasis: 'Module Learning With Errors (LWE) over lattices',
      comparison: {
        ecdhPublicKey: '32-64 bytes',
        ecdhPrivateKey: '~32 bytes',
        kyberPublicKey: '1184 bytes',
        kyberPrivateKey: '2400 bytes'
      }
    };
  }
}

// Factory function for easy instantiation
export function createKeyGenerator(): KyberKeyGenerator {
  return new KyberKeyGenerator();
}

// Export the MlKem768 class for direct use if needed
export { MlKem768 };
