import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, Mail, Lock, KeyRound, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthShell from "@/components/layout/AuthShell";
import { secureDB } from "@/lib/db";
import { encryptPrivateKey } from "@/lib/keyBackup";

const OTP_TTL_SECONDS = 300;

type VerifyStep = "otp" | "master_password";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<VerifyStep>("otp");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);

  // Master password state
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");

  // Pending keys (generated after OTP, before master password)
  const [pendingKeys, setPendingKeys] = useState<{
    publicKeyB64: string;
    privateKeyB64: string;
  } | null>(null);

  const email = useMemo(() => sessionStorage.getItem("register_email"), []);

  useEffect(() => {
    if (!email) navigate("/login");
  }, [email, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Step 1: Verify OTP and generate keys
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Generate Kyber keys via backend API
      console.log("🔐 Generating Post-Quantum Kyber keys via API...");

      const response = await fetch("/api/kyber/keygen", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Key generation failed on server");

      const publicKeyB64 = data.publicKey;
      const privateKeyB64 = data.privateKey;

      setPendingKeys({ publicKeyB64, privateKeyB64 });
      setStep("master_password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set master password, encrypt backup, and complete registration
  const handleSetMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pendingKeys) return;

    if (masterPassword.length < 8) {
      setError("Master password must be at least 8 characters.");
      return;
    }
    if (masterPassword !== confirmMasterPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Encrypt the private key with the master password
      console.log("🔒 Encrypting private key backup...");
      const backup = await encryptPrivateKey(pendingKeys.privateKeyB64, masterPassword);

      // 2. Verify OTP and send everything to the server
      const res = await fetch("/verify-register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          kyber_public_key: pendingKeys.publicKeyB64,
          encrypted_private_key: backup.encryptedBlob,
          backup_salt: backup.salt,
          backup_iv: backup.iv,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      // 3. Save PRIVATE KEY to IndexedDB
      console.log("💾 Saving private key to local secure storage...");
      await secureDB.saveUserKeys({
        username: data.username.toLowerCase(),
        privateKey: pendingKeys.privateKeyB64,
        publicKey: pendingKeys.publicKeyB64,
        createdAt: Date.now(),
      });

      sessionStorage.removeItem("register_email");
      navigate("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <AuthShell
      title={step === "otp" ? "Verify Email" : "Set Master Password"}
      subtitle={step === "otp" ? "Complete secure sign-up verification" : "Protect your encryption keys"}
      icon={step === "otp" ? <ShieldCheck className="w-8 h-8 text-primary-foreground" /> : <KeyRound className="w-8 h-8 text-primary-foreground" />}
      maxWidthClassName="max-w-lg"
    >
      <AnimatePresence mode="wait">
        {step === "otp" ? (
          <motion.div key="otp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass-card quantum-card rounded-[2rem] p-6 sm:p-8 border border-border/70">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/65 mb-7">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Sending To</p>
                <p className="text-sm font-semibold truncate">{email || "your email"}</p>
              </div>
              <div className="ml-auto text-xs font-bold text-primary">
                {minutes}:{seconds}
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-7">
              <div className="flex flex-col items-center gap-3">
                <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} aria-label="One-time password" containerClassName="justify-center">
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} className="h-12 w-12 rounded-xl border border-border/70 bg-card/70" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Check inbox or spam if code is delayed.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
                {loading ? "Generating keys..." : "Verify & Continue"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            {error ? <p className="mt-4 text-sm text-destructive font-medium text-center">{error}</p> : null}

            <div className="mt-6 text-center">
              <button type="button" onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Back to sign in
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="master_password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass-card quantum-card rounded-[2rem] p-6 sm:p-8 border border-border/70">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-amber-500/10 mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-200/80">
                This password encrypts your private key for cross-device access. <strong>If you forget it, your backup cannot be recovered.</strong>
              </p>
            </div>

            <form onSubmit={handleSetMasterPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="masterPw">Master Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="masterPw"
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="pl-10 h-11 glass-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmMasterPw">Confirm Master Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmMasterPw"
                    type="password"
                    value={confirmMasterPassword}
                    onChange={(e) => setConfirmMasterPassword(e.target.value)}
                    placeholder="Re-enter master password"
                    autoComplete="new-password"
                    className="pl-10 h-11 glass-input"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
                {loading ? "Encrypting & saving..." : "Secure My Keys & Continue"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            {error ? <p className="mt-4 text-sm text-destructive font-medium text-center">{error}</p> : null}

            <div className="mt-6 text-center">
              <button type="button" onClick={() => { setStep("otp"); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to OTP
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
