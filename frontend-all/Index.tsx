import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Zap, Shield, ArrowRight, LockKeyhole } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { motion } from "framer-motion";

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
  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen relative z-10">
        <header className="h-20 px-4 sm:px-8 lg:px-12 flex items-center justify-between border-b border-border/60 glass">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center glow-primary">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-display font-bold">RelayBoy</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Secure Relay Chat</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="rounded-xl">Sign in</Button>
            </Link>
            <Link to="/chat">
              <Button className="rounded-xl gradient-primary text-primary-foreground">Open Chat</Button>
            </Link>
          </div>
        </header>

        <main className="px-4 sm:px-8 lg:px-12 py-12 lg:py-16">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.3fr_1fr] gap-8 items-stretch">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card quantum-card rounded-[2rem] border-border/70 p-8 md:p-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs font-bold uppercase tracking-wider">
                <LockKeyhole className="w-4 h-4" />
                Quantum-Safe Communication
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight">
                Redefined secure chat,
                <span className="block gradient-text">built for modern teams.</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
                RelayBoy combines responsive UX, unread-intelligent conversation flow, and strong cryptographic foundations without changing your core backend behavior.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/login">
                  <Button className="h-12 px-6 rounded-xl gradient-primary text-primary-foreground font-bold">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/chat">
                  <Button variant="outline" className="h-12 px-6 rounded-xl border-border/80 bg-card/60">
                    Go to Chat
                  </Button>
                </Link>
              </div>
            </motion.section>

            <section className="grid sm:grid-cols-3 lg:grid-cols-1 gap-4">
              {features.map((f, i) => (
                <motion.article
                  key={f.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className="glass-card rounded-3xl p-6 border-border/70"
                >
                  <div className="w-11 h-11 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.article>
              ))}
            </section>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
