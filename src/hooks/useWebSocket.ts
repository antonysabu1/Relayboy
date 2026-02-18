import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface ChatMessage {
  from: string;
  message: string;
  timestamp: string;
  is_seen?: boolean;
}

interface WSMessage {
  type: string;
  username?: string;
  avatar_url?: string;
  users?: ChatUser[];
  from?: string;
  message?: string;
  timestamp?: string;
  error?: string;
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
  const [history, setHistory] = useState<{ with: string; messages: ChatMessage[] } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{ [user: string]: number }>({});
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.hostname === "localhost" ? "ws" : "wss";
    const socket = new WebSocket(`${protocol}://${window.location.host}`);
    socketRef.current = socket;

    setStatus("connecting");
    setError("");

    socket.onopen = () => {
      setStatus("connecting");
    };

    socket.onmessage = (e) => {
      const data: WSMessage & { with?: string; messages?: any[] } = JSON.parse(e.data);

      if (data.type === "error") {
        setError(data.error || "Connection error");
        socket.close();
      }

      if (data.type === "connected" && data.username) {
        setUsername(data.username);
        setAvatarUrl(data.avatar_url || "");
        setStatus("connected");
      }

      if (data.type === "users" && data.users) {
        setUsers(data.users);
      }

      if (data.type === "message" && data.from && data.message) {
        setIncomingMessage({
          from: data.from,
          message: data.message,
          timestamp: data.timestamp || new Date().toLocaleTimeString(),
        });
      }

      if (data.type === "unread_counts") {
        setUnreadCounts((data as any).counts || {});
      }

      if (data.type === "history" && data.with && data.messages) {
        setHistory({
          with: data.with,
          messages: data.messages.map(m => ({
            from: m.from,
            message: m.message,
            is_seen: m.is_seen,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }))
        });
      }
    };

    socket.onclose = () => {
      setStatus("disconnected");
    };

    socket.onerror = () => {
      setStatus("disconnected");
      setError("WebSocket connection failed");
    };
  }, []);

  const sendMessage = useCallback((to: string, message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "message", to, message }));
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
    socketRef.current?.close();
  }, []);

  useEffect(() => {
    return () => {
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
    unreadCounts,
    setUnreadCounts,
    connect,
    sendMessage,
    getHistory,
    sendSeen,
    disconnect,
  };
}
