import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Zap, Shield, ArrowRight, Sparkles } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Index() {
  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen flex flex-col relative z-10">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 lg:px-12 backdrop-blur-sm border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg glow-primary">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold gradient-text">RelayBoy</span>
          </div>
          <Link to="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-white/5">
              Sign in
              <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="text-center max-w-3xl"
          >
            {/* Badge */}
            <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 border border-white/10 neon-outline">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">Quantum-secure relay mesh for modern teams</span>
            </motion.div>

            {/* Main heading */}
            <motion.h1 variants={item} className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight tracking-tight">
              Quantum-secure{" "}
              <span className="gradient-text glow-text">RelayBoy</span>
            </motion.h1>

            <motion.p variants={item} className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              A stunning dark UI for secure, low-latency chat with quantum-ready
              privacy layers and a relay-first architecture.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link to="/login">
                <Button size="lg" className="gradient-primary hover:opacity-90 transition-all hover:scale-105 shadow-xl glow-primary h-14 px-10 text-base font-semibold rounded-2xl">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/chat">
                <Button size="lg" variant="outline" className="h-14 px-10 text-base font-semibold border-white/10 hover:bg-white/5 rounded-2xl transition-all hover:scale-105">
                  Open Chat
                </Button>
              </Link>
            </motion.div>

            {/* Feature cards */}
            <motion.div variants={container} className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Zap, title: "Quantum Fast", desc: "Optimized relay routing with ultra-low latency" },
                { icon: Users, title: "Live Presence", desc: "Presence signals and verified identity states" },
                { icon: Shield, title: "Post-Quantum Ready", desc: "Hybrid encryption with forward secrecy" }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="glass-card quantum-card rounded-3xl p-6 text-left border border-white/5 hover:border-primary/30 transition-colors group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="py-8 text-center border-t border-white/5">
          <p className="text-xs text-muted-foreground/40 font-medium">
            Built with care for the next generation of secure chat
          </p>
        </footer>
      </div>
    </PageTransition>
  );
}
