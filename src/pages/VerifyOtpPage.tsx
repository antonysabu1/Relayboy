import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Mail, Sparkles, Lock } from "lucide-react";

import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.45, ease: "easeOut" as const } },
};

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
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-lg"
        >
          <motion.div variants={item} className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl shadow-xl glow-primary mb-4">
              <ShieldCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold gradient-text mb-2">Verify Your Email</h1>
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Enter the 6-digit code we sent
            </p>
          </motion.div>

          <motion.div
            variants={item}
            className="glass-card quantum-card rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/10"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 mb-8">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Sending To</p>
                <p className="text-sm font-semibold truncate">{email || "your email"}</p>
              </div>
              <div className="ml-auto text-xs font-bold text-primary">
                {minutes}:{seconds}
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-8">
              <div className="flex flex-col items-center gap-3">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-12 text-lg rounded-2xl border border-white/10 bg-white/5 text-foreground shadow-inner"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Lock className="w-3 h-3 text-primary" />
                  Didn't get the code? Check spam or retry from sign-up.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg glow-primary h-13 text-base font-bold rounded-2xl"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>

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
                onClick={() => navigate("/login")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
