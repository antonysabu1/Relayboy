/**
 * 🗄️ IndexedDB Manager for Quantum Relayboy
 * Stores sensitive client-side data: Private Keys, Shared Secrets, and Ratchet States.
 */

const DB_NAME = "relayboy_secure_storage";
const DB_VERSION = 2;

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

export interface DecryptedMessageRecord {
  id: string | number;
  plaintext: string;
}

export class SecureDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("user_keys")) {
          db.createObjectStore("user_keys", { keyPath: "username" });
        }

        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "peerUsername" });
        }

        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages", { keyPath: "id" });
        }

        // New: decrypted message plaintext cache
        if (!db.objectStoreNames.contains("decrypted_cache")) {
          db.createObjectStore("decrypted_cache", { keyPath: "id" });
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

  // --- Decrypted Message Cache ---

  async cacheDecryptedMessage(id: string | number, plaintext: string): Promise<void> {
    await this.init();
    return this.performTransaction("decrypted_cache", "readwrite", (store) =>
      store.put({ id: String(id), plaintext })
    );
  }

  async getCachedMessages(ids: (string | number)[]): Promise<Map<string, string>> {
    await this.init();
    const result = new Map<string, string>();
    if (!this.db || ids.length === 0) return result;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("decrypted_cache", "readonly");
      const store = transaction.objectStore("decrypted_cache");
      let pending = ids.length;

      for (const id of ids) {
        const req = store.get(String(id));
        req.onsuccess = () => {
          if (req.result) {
            result.set(String(id), req.result.plaintext);
          }
          pending--;
          if (pending === 0) resolve(result);
        };
        req.onerror = () => {
          pending--;
          if (pending === 0) resolve(result);
        };
      }
    });
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
