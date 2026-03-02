import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, User, Lock, ArrowRight, Shield, KeyRound, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthShell from "@/components/layout/AuthShell";
import { secureDB } from "@/lib/db";
import { decryptPrivateKey } from "@/lib/keyBackup";

type AuthMode = "login" | "register" | "restore";

interface PendingBackup {
  username: string;
  encryptedBlob: string;
  salt: string;
  iv: string;
  publicKey: string | null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [pendingBackup, setPendingBackup] = useState<PendingBackup | null>(null);

  const handleRestoreKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingBackup) return;
    if (masterPassword.length < 1) {
      setError("Enter your master password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const privateKeyB64 = await decryptPrivateKey(
        pendingBackup.encryptedBlob,
        pendingBackup.salt,
        pendingBackup.iv,
        masterPassword
      );

      await secureDB.saveUserKeys({
        username: pendingBackup.username.toLowerCase(),
        privateKey: privateKeyB64,
        publicKey: pendingBackup.publicKey || "",
        createdAt: Date.now(),
      });

      console.log("✅ Private key restored from backup!");
      navigate("/chat");
    } catch {
      setError("Incorrect master password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: loginIdentifier, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      // Check if we already have keys locally
      const existingKeys = await secureDB.getUserKeys(data.username);
      if (existingKeys) {
        // Keys exist locally, go straight to chat
        navigate("/chat");
        return;
      }

      // No local keys — need to restore from backup
      if (data.encrypted_private_key && data.backup_salt && data.backup_iv) {
        // Store backup data and prompt for master password
        setPendingBackup({
          username: data.username,
          encryptedBlob: data.encrypted_private_key,
          salt: data.backup_salt,
          iv: data.backup_iv,
          publicKey: null, // We'll fetch it if needed
        });
        setMode("restore");
      } else {
        // No backup exists — just go to chat (messages will be unreadable)
        navigate("/chat");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, username: regUsername, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      sessionStorage.setItem("register_email", regEmail);
      navigate("/verify-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Restore keys screen (early return)
  if (mode === "restore") return (
    <AuthShell
      title="Restore Encryption Keys"
      subtitle="Enter your master password to unlock your keys on this device"
      icon={<KeyRound className="w-8 h-8 text-primary-foreground" />}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card quantum-card rounded-[2rem] p-6 sm:p-8 border border-border/70"
      >
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-amber-500/10 mb-5">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-200/80">
            Your encrypted key backup was found. Enter your <strong>Master Password</strong> (set during registration) to restore access to your messages.
          </p>
        </div>

        <form onSubmit={handleRestoreKeys} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="restoreMasterPw">Master Password</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="restoreMasterPw"
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter your master password"
                autoComplete="off"
                className="pl-10 h-11 glass-input"
                required
                autoFocus
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
            {loading ? "Decrypting..." : "Restore My Keys"}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {error ? <p className="mt-4 text-sm text-destructive font-medium text-center">{error}</p> : null}

        <div className="mt-6 text-center">
          <button type="button" onClick={() => { setMode("login"); setError(""); setMasterPassword(""); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to sign in
          </button>
        </div>
      </motion.div>
    </AuthShell>
  );

  return (
    <AuthShell
      title="RelayBoy"
      subtitle="Private messaging with refined UI and resilient UX"
      icon={<MessageCircle className="w-8 h-8 text-primary-foreground" />}
      footer={(
        <p className="text-center text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center justify-center gap-2">
          <Shield className="w-3 h-3 text-primary" />
          Quantum Secure | Relay Ready
        </p>
      )}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card quantum-card rounded-[2rem] p-6 sm:p-8 border border-border/70"
      >
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 p-1 bg-card/70 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`h-9 rounded-lg text-sm font-semibold transition ${mode === "login" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`h-9 rounded-lg text-sm font-semibold transition ${mode === "register" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
          >
            Register
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Email or Username</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    autoComplete="username"
                    className="pl-10 h-11 glass-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pl-10 h-11 glass-input"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onSubmit={handleRegister}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    autoComplete="email"
                    className="pl-10 h-11 glass-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    autoComplete="username"
                    className="pl-10 h-11 glass-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="regPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="regPassword"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pl-10 h-11 glass-input"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
                {loading ? "Creating account..." : "Create account"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        {error ? <p className="mt-4 text-sm text-destructive font-medium text-center">{error}</p> : null}
      </motion.div>
    </AuthShell>
  );
}
