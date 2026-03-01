import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, User, Lock, ArrowRight, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthShell from "@/components/layout/AuthShell";
import { ParticleCard } from "@/components/MagicBento";

type AuthMode = "login" | "register";

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
      navigate("/chat");
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
        className="w-full"
      >
        <ParticleCard
          className="magic-bento-card magic-bento-card--border-glow w-full p-6 sm:p-8 rounded-[2rem] border border-cyan-500/20 shadow-[0_0_30px_rgba(0,219,255,0.15)]"
          style={{ backgroundColor: 'rgba(10, 15, 25, 0.5)', '--glow-color': '0, 219, 255' } as any}
          enableTilt={true}
          clickEffect={true}
          glowColor="0, 219, 255"
        >
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-cyan-500/30 p-1 bg-black/40 mb-6 relative z-10 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`h-9 rounded-lg text-sm font-semibold transition ${mode === "login" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,219,255,0.2)]" : "text-cyan-100/50 hover:text-cyan-100/80 hover:bg-white/5"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`h-9 rounded-lg text-sm font-semibold transition ${mode === "register" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,219,255,0.2)]" : "text-cyan-100/50 hover:text-cyan-100/80 hover:bg-white/5"}`}
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
                className="space-y-4 relative z-10 pointer-events-auto"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-cyan-50 font-medium ml-1">Email or Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300/70" />
                    <Input
                      id="identifier"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      autoComplete="username"
                      className="pl-10 h-11 bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-100/40 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400"
                      placeholder="Enter details..."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-cyan-50 font-medium ml-1">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300/70" />
                    <Input
                      id="password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      className="pl-10 h-11 bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-100/40 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold border border-cyan-400/50 shadow-[0_0_15px_rgba(0,219,255,0.3)] transition-all mt-6">
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
                className="space-y-4 relative z-10 pointer-events-auto"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-cyan-50 font-medium ml-1">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300/70" />
                    <Input
                      id="email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      autoComplete="email"
                      className="pl-10 h-11 bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-100/40 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400"
                      placeholder="Enter email address..."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-cyan-50 font-medium ml-1">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300/70" />
                    <Input
                      id="username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      autoComplete="username"
                      className="pl-10 h-11 bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-100/40 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400"
                      placeholder="Choose a username..."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regPassword" className="text-cyan-50 font-medium ml-1">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-300/70" />
                    <Input
                      id="regPassword"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pl-10 h-11 bg-black/40 border-cyan-500/30 text-white placeholder:text-cyan-100/40 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold border border-cyan-400/50 shadow-[0_0_15px_rgba(0,219,255,0.3)] transition-all mt-6">
                  {loading ? "Creating account..." : "Create account"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {error ? <p className="mt-4 text-sm text-red-400/90 font-medium text-center relative z-10 bg-red-950/40 border border-red-500/50 rounded-lg py-2 px-3">{error}</p> : null}
        </ParticleCard>
      </motion.div>
    </AuthShell >
  );
}
