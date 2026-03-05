import { useState, useEffect, useCallback, useRef } from "react";
import { CryptoSession, isEncryptedMessage, wrapEncrypted } from "@/lib/crypto";
import { secureDB } from "@/lib/db";
// Kyber removed, replacing with API calls


export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface ChatMessage {
  id?: string | number;
  from: string;
  message: string;
  timestamp: string;
  is_seen?: boolean;
  encrypted?: boolean;
  delivery_status?: "sending" | "delivered" | "seen" | "failed";
}

interface WSMessage {
  type: string;
  id?: string | number;
  username?: string;
  avatar_url?: string;
  users?: ChatUser[];
  from?: string;
  message?: string;
  timestamp?: string;
  error?: string;
  handshake?: any;
  with?: string;
  messages?: any[];
  counts?: { [user: string]: number };
  encrypted?: boolean;
  peer_public_key?: string;
}

export interface ChatUser {
  username: string;
  avatar_url?: string;
  is_online?: boolean;
}

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [error, setError] = useState<string>("");
  const [incomingMessage, setIncomingMessage] = useState<ChatMessage | null>(null);
  const [history, setHistory] = useState<{ with: string; messages: ChatMessage[]; shared_secret?: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{ [user: string]: number }>({});
  const [seenBy, setSeenBy] = useState<{ from: string; at: number } | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const sessionsRef = useRef<Map<string, CryptoSession>>(new Map());
  const pendingSessionsRef = useRef<Map<string, Promise<CryptoSession | null>>>(new Map());
  const processedMessageIds = useRef<Set<string | number>>(new Set());
  const usernameRef = useRef<string>("");
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const getOrCreateSession = async (peer: string, handshakeData?: any, peerPublicKey?: string) => {
    const peerKey = peer.toLowerCase();

    // Only use in-memory cache if we have NO new handshake data to validate against
    if (!handshakeData && !peerPublicKey && sessionsRef.current.has(peerKey)) {
      return sessionsRef.current.get(peerKey)!;
    }

    if (pendingSessionsRef.current.has(peerKey)) {
      return await pendingSessionsRef.current.get(peerKey)!;
    }

    const initPromise = (async () => {
      try {
        // 1. Check IndexedDB for existing session and validate it against the server handshake
        let existingSession = await secureDB.getSession(peerKey);

        if (handshakeData) {
          if (handshakeData.ciphertext) {
            if (existingSession && existingSession.ciphertext !== handshakeData.ciphertext) {
              console.warn(`[Crypto] Cached ciphertext mismatch for ${peerKey}. Discarding stale session.`);
              await secureDB.deleteSession(peerKey);
              existingSession = null;
            }
          } else if (handshakeData.type === "provide_public_key") {
            if (existingSession) {
              console.warn(`[Crypto] Server requested new handshake for ${peerKey}. Discarding stale session.`);
              await secureDB.deleteSession(peerKey);
              existingSession = null;
            }
          }
        }

        if (existingSession) {
          console.log(`💾 Restoring secure session for ${peerKey} from IndexedDB`);
          const session = await CryptoSession.create(existingSession.sharedSecret, usernameRef.current, peerKey);
          sessionsRef.current.set(peerKey, session);
          return session;
        }

        // 2. No valid session in DB - check if we have data to establish one
        if (!handshakeData && !peerPublicKey) return null;

        let sharedSecretB64: string | null = null;
        let newCiphertext: string | null = null;

        const isReceiverOfCurrentHandshake = handshakeData && handshakeData.ciphertext && handshakeData.receiver?.toLowerCase() === usernameRef.current.toLowerCase();

        if (isReceiverOfCurrentHandshake) {
          // We are RECEIVER: Decapsulate using our private key
          console.log(`🤝 Completing handshake with ${peerKey} (RECEIVER) via API`);
          const myKeys = await secureDB.getUserKeys(usernameRef.current);
          if (!myKeys) {
            console.error("❌ Cannot decapsulate: Local private key missing!");
            return null;
          }

          const response = await fetch("/api/kyber/decapsulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ciphertext: handshakeData.ciphertext,
              privateKey: myKeys.privateKey
            })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Decapsulation failed");

          sharedSecretB64 = data.sharedSecret;
          newCiphertext = handshakeData.ciphertext;
        } else {
          // We are SENDER (or no handshake exists, or we lost our sender cache): Encapsulate using peer's public key
          const pubKeyToUse = (handshakeData && handshakeData.public_key) || peerPublicKey;
          if (!pubKeyToUse) {
            console.error("❌ Cannot encapsulate: Peer public key missing!");
            return null;
          }

          console.log(`🤝 Initiating new handshake with ${peerKey} (SENDER) via API`);

          const response = await fetch("/api/kyber/encapsulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicKey: pubKeyToUse })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Encapsulation failed");

          sharedSecretB64 = data.sharedSecret;
          newCiphertext = data.ciphertext;

          // Store ciphertext on server
          socketRef.current?.send(JSON.stringify({
            type: "store_handshake",
            to: peer,
            ciphertext: data.ciphertext
          }));
        }

        if (sharedSecretB64) {
          const session = await CryptoSession.create(sharedSecretB64, usernameRef.current, peerKey);

          // Save to IndexedDB for persistence
          await secureDB.saveSession({
            peerUsername: peerKey,
            sharedSecret: sharedSecretB64,
            ciphertext: newCiphertext || undefined,
            lastUpdated: Date.now()
          });

          sessionsRef.current.set(peerKey, session);
          return session;
        }

        return null;
      } catch (err) {
        console.error("❌ Session initialization failed:", err);
        return null;
      } finally {
        pendingSessionsRef.current.delete(peerKey);
      }
    })();

    pendingSessionsRef.current.set(peerKey, initPromise);
    return await initPromise;
  };

  const connectLogic = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    shouldReconnectRef.current = true;
    clearReconnectTimer();

    const protocol = window.location.hostname === "localhost" ? "ws" : "wss";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    socketRef.current = socket;

    setStatus("connecting");

    socket.onopen = () => {
      setStatus("connected");
      setError("");
      reconnectAttemptsRef.current = 0;
      setReconnectAttempt(0);
    };

    socket.onmessage = async (e) => {
      let data: WSMessage;
      try {
        data = JSON.parse(e.data);
      } catch (err) {
        console.error("Invalid WS payload:", err);
        return;
      }

      if (data.type === "error") {
        setError(data.error || "Connection error");
        socket.close();
        return;
      }

      if (data.type === "message_rejected") {
        setError(data.error || "Message rejected by secure transport policy");
      }

      if (data.type === "connected" && data.username) {
        setUsername(data.username);
        usernameRef.current = data.username;
        setAvatarUrl(data.avatar_url || "");
        setStatus("connected");
      }

      if (data.type === "users" && data.users) {
        setUsers(data.users);
      }

      if (data.type === "message" && data.from && data.message) {
        if (data.id && processedMessageIds.current.has(data.id)) return;
        if (data.id) processedMessageIds.current.add(data.id);

        let displayMessage = data.message;

        if (isEncryptedMessage(data.message)) {
          const session = await getOrCreateSession(data.from);
          if (session) {
            try {
              displayMessage = await session.decrypt(data.message.slice(4));
            } catch {
              console.warn(`[Crypto] Live message decrypt failed for ${data.from}. Invalidating stale session.`);
              // Invalidate stale session from memory and IndexedDB
              sessionsRef.current.delete(data.from.toLowerCase());
              await secureDB.deleteSession(data.from.toLowerCase());
              // Request fresh history with handshake data
              socketRef.current?.send(JSON.stringify({ type: "get_history", to: data.from }));
              displayMessage = "🔄 [Re-establishing secure session...]";
            }
          } else {
            displayMessage = "[Encrypted - Open chat to decrypt]";
          }
        }

        setIncomingMessage({
          id: data.id,
          from: data.from,
          message: displayMessage,
          timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          encrypted: !!data.encrypted || isEncryptedMessage(data.message),
        });
      }

      if (data.type === "unread_counts") {
        setUnreadCounts(data.counts || {});
      }

      if (data.type === "seen" && data.from) {
        setSeenBy({ from: data.from, at: Date.now() });
      }

      if (data.type === "history" && data.with && data.messages) {
        const peerKey = data.with.toLowerCase();
        let processedMessages: ChatMessage[] = data.messages.map((m) => {
          if (m.id) processedMessageIds.current.add(m.id);
          return {
            id: m.id,
            from: m.from_user || m.from,
            message: m.message,
            is_seen: !!m.is_seen,
            timestamp: new Date(m.created_at || m.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            encrypted: !!m.encrypted,
          };
        });

        if (data.with) {
          // It's a history payload
          let decryptedMessages = processedMessages; // Initialize with processedMessages
          const session = await getOrCreateSession(data.with, data.handshake, data.peer_public_key);
          if (session) {
            decryptedMessages = await session.decryptHistory(processedMessages);
          }

          setHistory({
            with: data.with,
            messages: decryptedMessages,
          });
        }
      }
    };

    socket.onclose = () => {
      setStatus("disconnected");
      socketRef.current = null;

      if (!shouldReconnectRef.current) return;
      if (reconnectTimeoutRef.current !== null) return;

      const attempt = reconnectAttemptsRef.current + 1;
      reconnectAttemptsRef.current = attempt;
      setReconnectAttempt(attempt);

      const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, delay);
    };

    socket.onerror = () => {
      setStatus("disconnected");
      setError("WebSocket connection failed. Reconnecting...");
      socket.close();
    };
  };

  const connect = useCallback(connectLogic, []);

  const sendMessage = useCallback(async (to: string, message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const session = await getOrCreateSession(to);
      if (!session) {
        setError("Secure session not ready. Open the chat and wait for key exchange.");
        socketRef.current.send(JSON.stringify({ type: "get_history", to }));
        return false;
      }

      try {
        const encrypted = await session.encrypt(message);
        const finalMessage = wrapEncrypted(encrypted);
        socketRef.current.send(JSON.stringify({ type: "message", to, message: finalMessage }));
      } catch (err) {
        console.error("Encryption failed:", err);
        setError("Encryption failed. Message not sent.");
        return false;
      }
      return true;
    }

    return false;
  }, []);

  const getHistory = useCallback((to: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "get_history", to }));
    }
  }, []);

  const sendSeen = useCallback((to: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "seen", to }));
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimer();
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      socketRef.current?.close();
    };
  }, []);

  return {
    status,
    username,
    avatarUrl,
    users,
    error,
    incomingMessage,
    history,
    unreadCounts,
    seenBy,
    reconnectAttempt,
    connect,
    sendMessage,
    getHistory,
    sendSeen,
    disconnect,
  };
}
