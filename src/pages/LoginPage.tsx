import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, User, Lock, ArrowRight, Sparkles, Shield } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form fields
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

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl shadow-xl glow-primary mb-4 transform hover:rotate-12 transition-transform">
              <MessageCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold gradient-text mb-2">RelayBoy</h1>
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Quantum-secure messaging, beautifully crafted
            </p>
          </motion.div>

          {/* Auth Card */}
          <motion.div
            layout
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card quantum-card rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/10"
          >
            <motion.h2
              key={mode}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold text-foreground mb-8 text-center"
            >
              {mode === "login" ? "Welcome back" : "Create account"}
            </motion.h2>

            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleLogin}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-sm font-medium text-muted-foreground ml-1">
                      Email or Username
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="identifier"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Enter your email or username"
                        className="pl-11 h-12 glass-input rounded-2xl focus-visible:ring-primary/30 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-muted-foreground ml-1">
                      Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-11 h-12 glass-input rounded-2xl focus-visible:ring-primary/30 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-primary hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg glow-primary h-13 text-base font-bold rounded-2xl mt-2"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="register-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleRegister}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-muted-foreground ml-1">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-11 h-12 glass-input rounded-2xl focus-visible:ring-primary/30 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-muted-foreground ml-1">
                      Username
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Choose a username"
                        className="pl-11 h-12 glass-input rounded-2xl focus-visible:ring-primary/30 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regPassword" className="text-sm font-medium text-muted-foreground ml-1">
                      Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="regPassword"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a password"
                        className="pl-11 h-12 glass-input rounded-2xl focus-visible:ring-primary/30 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-primary hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg glow-primary h-13 text-base font-bold rounded-2xl mt-4"
                  >
                    {loading ? "Creating account..." : "Create account"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-sm text-destructive font-medium text-center"
              >
                {error}
              </motion.p>
            )}

            <div className="mt-8 text-center">
              <button
                onClick={toggleMode}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                {mode === "login" ? (
                  <>Don't have an account? <span className="text-primary font-bold group-hover:glow-text">Register</span></>
                ) : (
                  <>Already have an account? <span className="text-primary font-bold group-hover:glow-text">Sign in</span></>
                )}
              </button>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="text-center text-xs text-muted-foreground mt-8 uppercase tracking-widest font-bold flex items-center justify-center gap-2"
          >
            <Shield className="w-3 h-3 text-primary" />
            Quantum Secure | Relay Speed | Zero Trust
          </motion.p>
        </div>
      </div>
    </PageTransition>
  );
}
