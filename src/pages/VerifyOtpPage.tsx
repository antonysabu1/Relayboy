import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthShell from "@/components/layout/AuthShell";
import { ParticleCard } from "@/components/MagicBento";

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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <ParticleCard
          className="magic-bento-card magic-bento-card--border-glow w-full p-6 sm:p-8 rounded-[2rem] border border-cyan-500/20 shadow-[0_0_30px_rgba(0,219,255,0.15)]"
          style={{ backgroundColor: 'rgba(10, 15, 25, 0.5)', '--glow-color': '0, 219, 255' } as any}
          enableTilt={true}
          clickEffect={true}
          glowColor="0, 219, 255"
        >
          <div className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/30 bg-black/40 mb-7 relative z-10 pointer-events-none">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-cyan-100/70">Sending To</p>
              <p className="text-sm font-semibold truncate text-white">{email || "your email"}</p>
            </div>
            <div className="ml-auto text-xs font-bold text-cyan-300">
              {minutes}:{seconds}
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-7 relative z-10 pointer-events-auto">
            <div className="flex flex-col items-center gap-3">
              <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} aria-label="One-time password" containerClassName="justify-center">
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} className="h-12 w-12 rounded-xl border border-cyan-500/30 bg-black/40 text-lg font-bold text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-cyan-100/70 flex items-center gap-1.5 mt-2">
                <Lock className="w-3 h-3 text-cyan-300/70" />
                Check inbox or spam if code is delayed.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold border border-cyan-400/50 shadow-[0_0_15px_rgba(0,219,255,0.3)] transition-all">
              {loading ? "Verifying..." : "Verify & Continue"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {error ? <p className="mt-4 text-sm text-red-400/90 font-medium text-center relative z-10 bg-red-950/40 border border-red-500/50 rounded-lg py-2 px-3">{error}</p> : null}

          <div className="mt-6 text-center relative z-10 pointer-events-auto">
            <button type="button" onClick={() => navigate("/login")} className="text-sm text-cyan-100/60 hover:text-white transition-colors">
              Back to sign in
            </button>
          </div>
        </ParticleCard>
      </motion.div>
    </AuthShell>
  );
}
