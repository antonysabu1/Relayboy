import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useWebSocket, ChatMessage } from "@/hooks/useWebSocket";
import { ConnectionStatus } from "@/components/chat/ConnectionStatus";
import { UserListItem } from "@/components/chat/UserListItem";
import { ChatMessage as ChatBubble } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { MessageCircle, Users, LogOut, MessageSquare, Search, MoreVertical, Sparkles } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";

interface ChatHistory {
  [user: string]: ChatMessage[];
}

export default function ChatPage() {
  const { status, username, users, error, incomingMessage, history, connect, sendMessage, getHistory } = useWebSocket();
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connect();
  }, [connect]);

  // Handle incoming messages
  useEffect(() => {
    if (incomingMessage) {
      setChatHistory((prev) => ({
        ...prev,
        [incomingMessage.from]: [...(prev[incomingMessage.from] || []), incomingMessage],
      }));
    }
  }, [incomingMessage]);

  // Handle history updates
  useEffect(() => {
    if (history) {
      setChatHistory((prev) => ({
        ...prev,
        [history.with]: history.messages,
      }));
    }
  }, [history]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, currentChat]);

  const handleSendMessage = (message: string) => {
    if (!currentChat || !username) return;

    const success = sendMessage(currentChat, message);
    if (success) {
      const newMessage: ChatMessage = {
        from: username,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => ({
        ...prev,
        [currentChat]: [...(prev[currentChat] || []), newMessage],
      }));
    }
  };

  const openChat = (user: string) => {
    setCurrentChat(user);
    getHistory(user);
  };

  const otherUsers = users.filter((u) => u !== username);
  const currentMessages = currentChat ? chatHistory[currentChat] || [] : [];

  return (
    <PageTransition>
      <div className="h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
        <AnimatedBackground />

        {/* Header */}
        <header className="h-20 shrink-0 border-b border-white/5 glass z-20 flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-xl glow-primary cursor-pointer"
            >
              <MessageCircle className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-display font-bold gradient-text">RelayBoy</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-online animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Network Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ConnectionStatus status={status} username={username} />
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors group"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Logout</span>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative z-10">
          {/* Users Sidebar */}
          <aside className="w-80 shrink-0 border-r border-white/5 glass-card hidden md:flex flex-col m-4 rounded-[2rem] shadow-2xl">
            <div className="p-6">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full h-11 pl-11 pr-4 glass-input rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 ml-1">
                <Users className="w-4 h-4" />
                Online Now
                <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px]">
                  {otherUsers.length}
                </span>
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-thin">
              {otherUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 opacity-40">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Silence is golden...</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Wait for others to join the party</p>
                </div>
              ) : (
                <AnimatePresence>
                  {otherUsers.map((user, idx) => (
                    <motion.div
                      key={user}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <UserListItem
                        username={user}
                        isOnline
                        isActive={currentChat === user}
                        onClick={() => openChat(user)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Current User Profile Card */}
            {username && (
              <div className="p-4 mx-3 mb-4 bg-white/5 rounded-[1.5rem] border border-white/5">
                <div className="flex items-center gap-3">
                  <AvatarBadge name={username} isOnline size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{username}</p>
                    <p className="text-[10px] uppercase font-bold text-primary tracking-tighter">Your Profile</p>
                  </div>
                  <MoreVertical className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                </div>
              </div>
            )}
          </aside>

          {/* Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 m-4 md:ml-0 overflow-hidden glass-card rounded-[2rem] shadow-2xl border border-white/5">
            {currentChat ? (
              <div className="flex flex-col h-full bg-black/20">
                {/* Chat Header */}
                <div className="h-20 shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-white/5 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <AvatarBadge name={currentChat} isOnline size="md" />
                    <div>
                      <h2 className="font-bold text-lg">{currentChat}</h2>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-online rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-online uppercase tracking-wider">Active Now</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors">
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin flex flex-col">
                  {currentMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6"
                      >
                        <MessageSquare className="w-10 h-10 text-primary" />
                      </motion.div>
                      <h3 className="text-xl font-bold mb-2">Private Encryption Enabled</h3>
                      <p className="text-sm text-muted-foreground max-w-xs px-4">
                        Messages sent to <span className="text-primary font-bold">@{currentChat}</span> are end-to-end encrypted and visible only to you.
                      </p>
                    </div>
                  ) : (
                    currentMessages.map((msg, i) => (
                      <ChatBubble
                        key={i}
                        message={msg.message}
                        timestamp={msg.timestamp}
                        isSent={msg.from === username}
                        senderName={msg.from !== username ? msg.from : undefined}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white/5 border-t border-white/5">
                  <ChatInput
                    onSend={handleSendMessage}
                    disabled={status !== "connected"}
                    placeholder={`Type a message to ${currentChat}...`}
                  />
                </div>
              </div>
            ) : (
              /* No chat selected Empty State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-black/20">
                <motion.div
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-32 h-32 gradient-primary rounded-[3rem] flex items-center justify-center mb-8 shadow-2xl glow-primary relative"
                >
                  <MessageCircle className="w-16 h-16 text-primary-foreground" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full border-4 border-background flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                </motion.div>
                <h2 className="text-3xl font-display font-bold mb-3 tracking-tight">Your Digital Sanctuary</h2>
                <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                  Connect with your friends in a space designed for focus, privacy, and smooth interaction.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left">
                    <p className="text-xs font-bold text-primary uppercase mb-1">Status</p>
                    <p className="text-sm font-semibold">{status === "connected" ? "Ready to Chat" : "Connecting..."}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left">
                    <p className="text-xs font-bold text-secondary uppercase mb-1">Identity</p>
                    <p className="text-sm font-semibold">@{username || 'Anonymous'}</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-6 right-6 z-50 bg-destructive text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
            >
              <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center flex-shrink-0">!</div>
              <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

