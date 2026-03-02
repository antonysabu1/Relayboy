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
      icon={<MessageCircle className="w-8 h-8 text-white" />}
      footer={(
        <p className="text-center text-xs text-white uppercase tracking-widest font-bold flex items-center justify-center gap-2">
          <Shield className="w-3 h-3 text-white" />
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
          className="w-full rounded-[2rem] border border-white/10 p-2 md:rounded-[2.5rem] md:p-3 bg-black/10 backdrop-blur-md shadow-2xl"
          enableTilt={true}
          clickEffect={true}
        >
          <div className="relative flex flex-col overflow-hidden rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 bg-[#0A0F19]/60 border border-white/5 h-full w-full">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 p-1 bg-black/40 mb-8 relative z-10 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`h-10 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${mode === "login" ? "bg-white/10 text-white border border-white/20 shadow-lg" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={`h-10 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${mode === "register" ? "bg-white/10 text-white border border-white/20 shadow-lg" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
              >
                Register
              </button>
            </div>

            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleLogin}
                  className="space-y-5 relative z-10 pointer-events-auto"
                >
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-white/60 text-xs font-bold uppercase tracking-widest ml-1">Email or Username</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="identifier"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        autoComplete="username"
                        className="pl-12 h-12 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 rounded-xl"
                        placeholder="Enter details..."
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/60 text-xs font-bold uppercase tracking-widest ml-1">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        autoComplete="current-password"
                        className="pl-12 h-12 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 rounded-xl"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-14 bg-white text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all mt-4">
                    {loading ? "Signing in..." : "Sign in"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleRegister}
                  className="space-y-5 relative z-10 pointer-events-auto"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/60 text-xs font-bold uppercase tracking-widest ml-1">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        autoComplete="email"
                        className="pl-12 h-12 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 rounded-xl"
                        placeholder="Enter email address..."
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-white/60 text-xs font-bold uppercase tracking-widest ml-1">Username</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        autoComplete="username"
                        className="pl-12 h-12 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 rounded-xl"
                        placeholder="Choose a username..."
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regPassword" className="text-white/60 text-xs font-bold uppercase tracking-widest ml-1">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        id="regPassword"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        autoComplete="new-password"
                        className="pl-12 h-12 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 rounded-xl"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-14 bg-white text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all mt-4">
                    {loading ? "Creating account..." : "Create account"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {error ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-sm text-red-400 font-medium text-center relative z-10 bg-red-500/10 border border-red-500/20 rounded-xl py-3 px-4"
              >
                {error}
              </motion.p>
            ) : null}
          </div>
        </ParticleCard>
      </motion.div>
    </AuthShell>
  );
}
