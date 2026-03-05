/**
 * 🗄️ IndexedDB Manager for Quantum Relayboy
 * Stores sensitive client-side data: Private Keys, Shared Secrets, and Ratchet States.
 */

const DB_NAME = "relayboy_secure_storage";
const DB_VERSION = 1;

export interface UserKeyRecord {
  username: string;
  privateKey: string; // Base64
  publicKey: string;  // Base64
  createdAt: number;
}

export interface SessionRecord {
  peerUsername: string;
  sharedSecret: string; // Base64
  ciphertext?: string; // Base64
  lastUpdated: number;
}

export class SecureDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for user's own keys
        if (!db.objectStoreNames.contains("user_keys")) {
          db.createObjectStore("user_keys", { keyPath: "username" });
        }

        // Store for conversation sessions/secrets
        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "peerUsername" });
        }

        // Store for local message cache (optional, but requested)
        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages", { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
        reject("Failed to open IndexedDB");
      };
    });
  }

  // --- User Keys Store ---

  async saveUserKeys(record: UserKeyRecord): Promise<void> {
    await this.init();
    return this.performTransaction("user_keys", "readwrite", (store) => store.put(record));
  }

  async getUserKeys(username: string): Promise<UserKeyRecord | null> {
    await this.init();
    return this.performTransaction("user_keys", "readonly", (store) => store.get(username.toLowerCase()));
  }

  // --- Sessions Store ---

  async saveSession(record: SessionRecord): Promise<void> {
    await this.init();
    return this.performTransaction("sessions", "readwrite", (store) => store.put(record));
  }

  async getSession(peerUsername: string): Promise<SessionRecord | null> {
    await this.init();
    return this.performTransaction("sessions", "readonly", (store) => store.get(peerUsername.toLowerCase()));
  }

  async deleteSession(peerUsername: string): Promise<void> {
    await this.init();
    return this.performTransaction("sessions", "readwrite", (store) => store.delete(peerUsername.toLowerCase()));
  }

  // --- Generic Transaction Helper ---

  private async performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");

      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const secureDB = new SecureDB();
