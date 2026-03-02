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
      icon={<ShieldCheck className="w-8 h-8 text-white" />}
      maxWidthClassName="max-w-lg"
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <ParticleCard
          className="w-full rounded-[2rem] border border-white/10 p-2 md:rounded-[2.5rem] md:p-3 bg-black/10 backdrop-blur-md shadow-2xl"
          enableTilt={true}
          clickEffect={true}
        >
          <div className="relative flex flex-col overflow-hidden rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 bg-[#0A0F19]/60 border border-white/5 h-full w-full">
            <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/40 mb-8 relative z-10 pointer-events-none">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <Mail className="w-6 h-6 text-white/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Verification Sent To</p>
                <p className="text-sm font-bold truncate text-white">{email || "your email"}</p>
              </div>
              <div className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 tabular-nums">
                {minutes}:{seconds}
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-8 relative z-10 pointer-events-auto">
              <div className="flex flex-col items-center gap-4">
                <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} aria-label="One-time password" containerClassName="justify-center">
                  <InputOTPGroup className="gap-3">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} className="h-14 w-14 rounded-xl border border-white/10 bg-black/40 text-xl font-bold text-white focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white/[0.05] transition-all" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-[11px] text-white/30 flex items-center gap-2 mt-2 font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  Check your inbox or spam folder for the secure code.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 bg-white text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all">
                {loading ? "Verifying..." : "Verify & Continue"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>

            {error ? (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-sm text-red-400 font-medium text-center relative z-10 bg-red-500/10 border border-red-500/20 rounded-xl py-3 px-4"
              >
                {error}
              </motion.p>
            ) : null}

            <div className="mt-8 text-center relative z-10 pointer-events-auto">
              <button type="button" onClick={() => navigate("/login")} className="text-sm font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                Back to sign in
              </button>
            </div>
          </div>
        </ParticleCard>
      </motion.div>
    </AuthShell>
  );
}
