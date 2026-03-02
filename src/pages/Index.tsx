import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight, LockKeyhole, Shield } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import MagicBento, { ParticleCard } from "@/components/MagicBento";
import { motion } from "framer-motion";
import { useRef } from "react";

export default function Index() {
  const headerRef = useRef<HTMLElement>(null);

  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen relative z-10 font-sans">
        <header className="w-full border-b border-white/5 z-50 relative bg-black/40 backdrop-blur-md" ref={headerRef}>
          <div className="max-w-[1400px] mx-auto h-20 px-4 sm:px-8 lg:px-12 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-white/20">
                <MessageCircle className="text-black w-6 h-6" />
              </div>
              <span className="text-2xl font-display font-bold text-white tracking-tight">RelayBoy</span>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" className="text-white/60 hover:text-white transition-colors">Sign In</Button>
              </Link>
              <Link to="/chat">
                <Button className="rounded-xl bg-white text-black border border-white/30 font-bold hover:scale-105 transition-transform px-6">Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-8 lg:px-12 py-12 md:py-24 flex flex-col gap-24 lg:gap-32 overflow-hidden">
          {/* Hero Section */}
          <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col gap-8 text-left"
            >
              <div className="inline-flex items-center self-start gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <LockKeyhole className="w-4 h-4" />
                Quantum-Safe Protocol Active
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.05] text-white tracking-tighter">
                Secure Chat <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500">Without Trace.</span>
              </h1>

              <p className="text-lg sm:text-xl text-neutral-400 max-w-xl leading-relaxed font-light">
                RelayBoy combines next-gen cryptography with a seamless, immersive interface. Zero metadata leakage, end-to-end encryption by default.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/login">
                  <Button className="h-16 px-10 rounded-2xl bg-white text-black font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)] group">
                    Start Securely
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
              className="relative aspect-square lg:aspect-video rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-2xl overflow-hidden shadow-2xl group flex items-center justify-center p-8 lg:p-16"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-blue-500/10 pointer-events-none" />
              <div className="relative">
                <div className="absolute -inset-16 bg-cyan-500/30 blur-[100px] rounded-full animate-pulse" />
                <Shield className="w-32 h-32 sm:w-48 sm:h-48 text-white relative z-10 opacity-90 group-hover:scale-110 transition-transform duration-1000 ease-out" strokeWidth={0.5} />
              </div>

              {/* Subtle floating elements */}
              <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-cyan-400/40 animate-ping" />
              <div className="absolute bottom-1/3 right-1/4 w-3 h-3 rounded-full bg-blue-400/40 animate-ping [animation-delay:1s]" />
            </motion.div>
          </div>

          {/* Bento Grid Section */}
          <section className="max-w-[1400px] mx-auto w-full flex flex-col gap-12 text-center">
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">The future of privacy.</h2>
              <p className="text-neutral-500 text-lg sm:text-xl font-light">Every feature is built on top of Zero-Metadata and Zero-Knowledge principles.</p>
            </div>

            <div className="w-full">
              <MagicBento clickEffect={true} enableTilt={true} enableMagnetism={true} />
            </div>
          </section>
        </main>

        <footer className="w-full py-20 border-t border-white/5 bg-black/60 backdrop-blur-xl">
          <div className="max-w-[1400px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <MessageCircle className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-display font-bold text-white tracking-tight">RelayBoy</span>
            </div>
            <p className="text-white/40 text-sm">© 2024 RelayBoy. All rights reserved. Quantum secure.</p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
