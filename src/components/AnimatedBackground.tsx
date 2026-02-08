import { useMemo } from "react";
import { motion } from "framer-motion";

const AnimatedBackground = () => {
  const particles = useMemo(
    () =>
      [...Array(10)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.15,
        duration: Math.random() * 12 + 10,
        drift: Math.random() * 30 - 15,
      })),
    []
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Quantum aurora fields */}
      <div className="absolute -top-20 right-0 w-[60vw] h-[60vh] bg-primary/25 rounded-full blur-[140px] mix-blend-screen opacity-40 animate-pulse" />
      <div
        className="absolute -bottom-24 left-0 w-[55vw] h-[55vh] bg-secondary/25 rounded-full blur-[140px] mix-blend-screen opacity-35 animate-pulse"
        style={{ animationDelay: "1.5s" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vh] bg-accent/10 rounded-full blur-[160px] mix-blend-screen opacity-30" />

      {/* Quantum rings */}
      <div className="absolute top-16 left-10 w-32 h-32 rounded-full border border-white/10 opacity-30 animate-orbit" />
      <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full border border-primary/20 opacity-25 animate-orbit" />

      {/* Floating Particles */}
      <div className="absolute inset-0 opacity-30">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            initial={{
              x: `${p.x}vw`,
              y: `${p.y}vh`,
              opacity: p.opacity,
            }}
            animate={{
              y: [`${p.y}vh`, `${p.y - 10}vh`],
              x: [`${p.x}vw`, `${p.x + p.drift}vw`],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
          />
        ))}
      </div>

      {/* Grid and scanline overlays */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] bg-center [mask-image:radial-gradient(circle_at_center,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-[0.06] animate-scan" />
    </div>
  );
};

export default AnimatedBackground;
