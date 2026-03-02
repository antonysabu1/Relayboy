import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Zap, Shield, ArrowRight, LockKeyhole } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import MagicBento, { ParticleCard, GlobalSpotlight } from "@/components/MagicBento";
import { motion } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    icon: Zap,
    title: "Real-time Relay",
    desc: "Low-latency secure chat designed for always-on collaboration.",
  },
  {
    icon: Users,
    title: "Presence Aware",
    desc: "Live user state, recent conversations, and unread tracking in one flow.",
  },
  {
    icon: Shield,
    title: "Post-Quantum Ready",
    desc: "Kyber-backed key exchange and encrypted messaging pipeline.",
  },
];

export default function Index() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen relative z-10">
        <header className="bento-section w-full border-b border-white/5 z-50 relative" ref={headerRef}>
          <GlobalSpotlight gridRef={headerRef as any} glowColor="255, 255, 255" spotlightRadius={400} />
          <ParticleCard
            className="w-full h-20 px-4 sm:px-8 lg:px-12 flex flex-row items-center justify-between glass"
            style={{ backgroundColor: 'transparent', minHeight: '80px', borderRadius: 0 } as any}
            enableTilt={false}
            enableMagnetism={false}
            clickEffect={true}
            glowColor="255, 255, 255"
          >
            <div className="flex items-center gap-3 relative z-10 pointer-events-none">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-lg font-display font-bold text-white">RelayBoy</p>
                <p className="text-xs text-white uppercase tracking-widest font-semibold">Secure Relay Chat</p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <Link to="/login" className="pointer-events-auto">
                <Button variant="ghost" className="rounded-xl text-white hover:text-gray-300">Sign in</Button>
              </Link>
              <Link to="/chat" className="pointer-events-auto">
                <Button className="rounded-xl bg-white text-black border border-white/30">Open Chat</Button>
              </Link>
            </div>
          </ParticleCard>
        </header>

        <main className="px-4 sm:px-8 lg:px-12 pt-8 pb-12 min-h-[calc(100vh-80px)] flex flex-col justify-center">
          <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-[1.3fr_1fr] gap-8 items-stretch bento-section flex-1" ref={heroRef}>
            <GlobalSpotlight gridRef={heroRef as any} glowColor="255, 255, 255" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex"
            >
              <ParticleCard
                className="magic-bento-card magic-bento-card--border-glow w-full p-8 md:p-14 text-left flex flex-col justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', '--glow-color': '255, 255, 255' } as any}
                enableTilt={true}
                clickEffect={true}
                glowColor="255, 255, 255"
              >
                <div className="inline-flex items-center self-start gap-2 px-4 py-2 mb-8 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider relative z-10 pointer-events-none">
                  <LockKeyhole className="w-4 h-4 text-black" />
                  Quantum-Safe Communication
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold leading-[1.1] text-white relative z-10 pointer-events-none tracking-tight">
                  Redefined secure chat,
                  <span className="block text-white mt-2">built for modern teams.</span>
                </h1>

                <p className="mt-8 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed relative z-10 pointer-events-none font-light">
                  RelayBoy combines responsive UX, unread-intelligent conversation flow, and strong cryptographic foundations without changing your core backend behavior.
                </p>

                <div className="mt-10 flex flex-wrap gap-4 relative z-50">
                  <Link to="/login">
                    <Button className="h-14 px-8 rounded-xl bg-white text-black font-bold border border-white/30 transition-all">
                      Get Started
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/chat">
                    <Button variant="outline" className="h-14 px-8 rounded-xl border-white/30 bg-black/40 text-white hover:bg-white/10 transition-colors backdrop-blur-md">
                      Go to Chat
                    </Button>
                  </Link>
                </div>
              </ParticleCard>
            </motion.div>

            <div className="grid gap-4 auto-rows-fr relative z-20">
              {features.map((f, i) => (
                <motion.article
                  key={f.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className="h-full flex"
                >
                  <ParticleCard
                    className="magic-bento-card magic-bento-card--border-glow w-full p-6 flex flex-col justify-center"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', '--glow-color': '255, 255, 255', minHeight: 'auto' } as any}
                    enableTilt={true}
                    clickEffect={true}
                    glowColor="255, 255, 255"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-black flex items-center justify-center mb-4 relative z-10 pointer-events-none">
                      <f.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 relative z-10 text-white font-display pointer-events-none">{f.title}</h3>
                    <p className="text-sm text-white/70 leading-relaxed relative z-10 pointer-events-none">{f.desc}</p>
                  </ParticleCard>
                </motion.article>
              ))}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
