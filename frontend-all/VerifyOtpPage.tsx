import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthShell from "@/components/layout/AuthShell";

const OTP_TTL_SECONDS = 300;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/verify-register-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      sessionStorage.removeItem("register_email");
      navigate("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <AuthShell
      title="Verify Email"
      subtitle="Complete secure sign-up verification"
      icon={<ShieldCheck className="w-8 h-8 text-primary-foreground" />}
      maxWidthClassName="max-w-lg"
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card quantum-card rounded-[2rem] p-6 sm:p-8 border border-border/70">
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

        <form onSubmit={handleVerify} className="space-y-7">
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
            {loading ? "Verifying..." : "Verify & Continue"}
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
    </AuthShell>
  );
}
