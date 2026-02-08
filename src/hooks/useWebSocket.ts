import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface ChatMessage {
  from: string;
  message: string;
  timestamp: string;
}

interface WSMessage {
  type: string;
  username?: string;
  users?: string[];
  from?: string;
  message?: string;
  timestamp?: string;
  error?: string;
}

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [username, setUsername] = useState<string>("");
  const [users, setUsers] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [incomingMessage, setIncomingMessage] = useState<ChatMessage | null>(null);
  const [history, setHistory] = useState<{ with: string; messages: ChatMessage[] } | null>(null);
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

      if (data.type === "history" && data.with && data.messages) {
        setHistory({
          with: data.with,
          messages: data.messages.map(m => ({
            from: m.from,
            message: m.message,
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
    users,
    error,
    incomingMessage,
    history,
    connect,
    sendMessage,
    getHistory,
    disconnect,
  };
}
