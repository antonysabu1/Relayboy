import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket, ChatMessage } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { ConnectionStatus } from "@/components/chat/ConnectionStatus";
import { UserListItem } from "@/components/chat/UserListItem";
import { ChatMessage as ChatBubble } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import {
  MessageCircle, Users, LogOut, MessageSquare, Search,
  MoreVertical, Sparkles, User, Settings, Moon, Sun,
  Monitor, Trash2, Upload, X, Shield, Palette
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { supabase } from "@/../db.js";
import { toast } from "sonner";
interface ChatHistory {
  [user: string]: ChatMessage[];
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const {
    status, username, avatarUrl, setAvatarUrl, users,
    error, incomingMessage, history, unreadCounts, setUnreadCounts,
    connect, sendMessage, getHistory, sendSeen, disconnect
  } = useWebSocket();
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'online'>('recent');
  const [recentChats, setRecentChats] = useState<{ username: string, last_message: string, avatar_url: string | null, is_online?: boolean }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecentChats = async () => {
    try {
      const res = await fetch('/users/recent-chats');
      if (res.ok) {
        const data = await res.json();
        setRecentChats(data);
      }
    } catch (err) {
      console.error("Failed to fetch recent chats:", err);
    }
  };

  useEffect(() => {
    connect();
    fetchRecentChats();
  }, [connect]);

  // Handle incoming messages
  useEffect(() => {
    if (incomingMessage) {
      setChatHistory((prev) => ({
        ...prev,
        [incomingMessage.from]: [...(prev[incomingMessage.from] || []), incomingMessage],
      }));

      // If message is from current chat, mark as seen immediately
      if (currentChat === incomingMessage.from) {
        sendSeen(incomingMessage.from);
      } else {
        // Increment unread count locally for other users
        setUnreadCounts(prev => ({
          ...prev,
          [incomingMessage.from]: (prev[incomingMessage.from] || 0) + 1
        }));
      }

      fetchRecentChats(); // Refresh list on message
    }
  }, [incomingMessage, currentChat, sendSeen, setUnreadCounts]);

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

  const handleLogout = async () => {
    try {
      const res = await fetch("/logout", { method: "POST" });
      if (res.ok) {
        disconnect();
        navigate("/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${username}/${Math.random()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update User Profile via API
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl })
      });

      if (!res.ok) throw new Error("Failed to update profile");

      setAvatarUrl(publicUrl);
      toast.success("Profile photo updated!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    try {
      setUploading(true);
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: "" })
      });

      if (!res.ok) throw new Error("Failed to delete profile photo");

      setAvatarUrl("");
      toast.success("Profile photo removed");
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Delete failed");
    } finally {
      setUploading(false);
    }
  };

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
    sendSeen(user);

    // Clear unread count for this user locally
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[user];
      return next;
    });
  };

  const otherUsers = users.filter((u) => u.username !== username);
  const currentMessages = currentChat ? chatHistory[currentChat] || [] : [];

  return (
    <PageTransition>
      <div className="h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
        <AnimatedBackground />

        {/* Header - Simplified */}
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
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Quantum Link Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ConnectionStatus status={status} username={username} />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative z-10">
          {/* Left Profile Rail */}
          <nav className="w-20 shrink-0 border-r border-white/5 glass-card hidden md:flex flex-col items-center py-6 gap-6 m-4 mr-0 rounded-[2rem] shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 w-full h-1 gradient-primary opacity-50" />

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Profile & Settings"
                  className="relative group focus:outline-none"
                >
                  <AvatarBadge name={username || "?"} avatarUrl={avatarUrl} isOnline size="md" className="ring-2 ring-primary/20 ring-offset-4 ring-offset-background/50 transition-all group-hover:ring-primary/50" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-primary transition-colors">
                    <Settings className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white" />
                  </div>
                </motion.button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] glass-card border-white/10 rounded-[2.5rem] overflow-hidden p-0 gap-0 shadow-2xl">
                <div className="h-32 w-full gradient-primary relative">
                  <div className="absolute -bottom-12 left-8">
                    <div className="relative group">
                      <AvatarBadge name={username || "?"} avatarUrl={avatarUrl} size="lg" className="w-24 h-24 ring-4 ring-background shadow-2xl" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Upload className="w-6 h-6 text-white" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-8 pt-16 pb-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-bold">{username}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        Relay System Protocol v4.0
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleAvatarDelete}
                        disabled={!avatarUrl || uploading}
                        className="rounded-xl h-9 px-4 font-bold text-[10px] uppercase tracking-wider"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Wipe Avatar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5" />
                        Theme & Appearance
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { name: 'dark', icon: Moon },
                          { name: 'light', icon: Sun },
                          { name: 'system', icon: Monitor }
                        ].map((t) => (
                          <button
                            key={t.name}
                            onClick={() => setTheme(t.name)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all hover:scale-105",
                              theme === t.name
                                ? "bg-primary/10 border-primary text-primary shadow-lg glow-primary/10"
                                : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                            )}
                          >
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <LogOut className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Terminate Session</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Clear encryption keys and logout</p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="rounded-xl font-bold shadow-xl shadow-destructive/10"
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="w-8 h-px bg-white/5" />

            <div className="flex-1 flex flex-col gap-4">
              <motion.button
                whileHover={{ scale: 1.1, x: 2 }}
                onClick={() => setSidebarTab('recent')}
                title="Recent Chats"
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-lg",
                  sidebarTab === 'recent'
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-white/5 text-muted-foreground border-white/5 hover:text-foreground"
                )}
              >
                <MessageSquare className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1, x: 2 }}
                onClick={() => setSidebarTab('online')}
                title="Online Users"
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-lg",
                  sidebarTab === 'online'
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-white/5 text-muted-foreground border-white/5 hover:text-foreground"
                )}
              >
                <Users className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="mt-auto flex flex-col items-center gap-4 pb-2">
              <div className="w-2 h-2 rounded-full bg-online animate-pulse" />
              <div className="text-[10px] font-black rotate-180 [writing-mode:vertical-lr] text-muted-foreground/30 select-none tracking-[0.2em]">
                RELAYBOY v4.0
              </div>
            </div>
          </nav>
          {/* Users Sidebar */}
          <aside className="w-80 shrink-0 hidden md:flex flex-col m-4 rounded-[2rem] relative">
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
                {sidebarTab === 'online' ? (
                  <>
                    <Users className="w-4 h-4" />
                    Online Now
                    <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px]">
                      {otherUsers.length}
                    </span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Recent Chats
                    <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px]">
                      {recentChats.length}
                    </span>
                  </>
                )}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-thin">
              {(sidebarTab === 'online' ? otherUsers : recentChats).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 opacity-40">
                    {sidebarTab === 'online' ? <Users className="w-6 h-6 text-muted-foreground" /> : <MessageSquare className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {sidebarTab === 'online' ? "Silence is golden..." : "No recent chats"}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {sidebarTab === 'online' ? "Wait for others to join the party" : "Start a conversation to see it here"}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {(sidebarTab === 'online' ? otherUsers : recentChats).map((user, idx) => (
                    <motion.div
                      key={user.username}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <UserListItem
                        username={user.username}
                        avatarUrl={user.avatar_url}
                        isOnline={users.find(u => u.username === user.username)?.is_online}
                        isActive={currentChat === user.username}
                        unreadCount={unreadCounts[user.username]}
                        onClick={() => openChat(user.username)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Current User Profile Card - Simplified */}
            {username && (
              <div className="p-4 mx-3 mb-4 bg-white/5 rounded-[1.5rem] border border-white/5 flex items-center gap-3">
                <AvatarBadge name={username} avatarUrl={avatarUrl} isOnline size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{username}</p>
                </div>
              </div>
            )}
          </aside>

          {/* Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 m-4 md:ml-0 overflow-hidden relative">
            {currentChat ? (
              <div className="flex flex-col h-full bg-black/20">
                {/* Chat Header */}
                <div className="h-20 shrink-0 flex items-center justify-between px-8 bg-transparent">
                  <div className="flex items-center gap-4">
                    <AvatarBadge
                      name={currentChat}
                      avatarUrl={users.find(u => u.username === currentChat)?.avatar_url}
                      isOnline
                      size="md"
                    />
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
                      <h3 className="text-xl font-bold mb-2">Quantum Encryption Enabled</h3>
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
                        isSeen={msg.is_seen}
                        senderName={msg.from !== username ? msg.from : undefined}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 pt-2 bg-transparent">
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
                <h2 className="text-3xl font-display font-bold mb-3 tracking-tight">Quantum Secure Channel</h2>
                <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                  Connect with your team in a space built for privacy, relay speed, and zero-trust collaboration.
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

