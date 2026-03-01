import { useState, useEffect, useCallback, useRef } from "react";
import { CryptoSession, isEncryptedMessage, wrapEncrypted } from "@/lib/crypto";

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
  shared_secret?: string;
  with?: string;
  messages?: unknown[];
  counts?: { [user: string]: number };
  encrypted?: boolean;
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

  const getOrCreateSession = async (peer: string, sharedSecret?: string) => {
    const peerKey = peer.toLowerCase();

    if (sessionsRef.current.has(peerKey)) return sessionsRef.current.get(peerKey)!;

    if (pendingSessionsRef.current.has(peerKey)) {
      return await pendingSessionsRef.current.get(peerKey)!;
    }

    if (!sharedSecret) return null;

    const initPromise = (async () => {
      try {
        const session = await CryptoSession.create(sharedSecret, usernameRef.current, peerKey);
        sessionsRef.current.set(peerKey, session);
        return session;
      } finally {
        pendingSessionsRef.current.delete(peerKey);
      }
    })();

    pendingSessionsRef.current.set(peerKey, initPromise);
    return await initPromise;
  };

  const connect = useCallback(() => {
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
              displayMessage = "[Decryption Failed]";
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

        if (data.shared_secret && usernameRef.current) {
          const resyncPromise = (async () => {
            try {
              const session = await CryptoSession.create(data.shared_secret!, usernameRef.current, peerKey);
              const decrypted = await session.decryptHistory(processedMessages);
              sessionsRef.current.set(peerKey, session);
              return { decrypted, session };
            } finally {
              pendingSessionsRef.current.delete(peerKey);
            }
          })();

          pendingSessionsRef.current.set(peerKey, resyncPromise.then((r) => r.session));
          const { decrypted } = await resyncPromise;
          processedMessages = decrypted;
        }

        setHistory({
          with: data.with,
          shared_secret: data.shared_secret,
          messages: processedMessages,
        });
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
  }, []);

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
    setAvatarUrl,
    users,
    error,
    incomingMessage,
    history,
    seenBy,
    unreadCounts,
    reconnectAttempt,
    setUnreadCounts,
    connect,
    sendMessage,
    getHistory,
    sendSeen,
    disconnect,
  };
}
