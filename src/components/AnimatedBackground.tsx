import { useMemo } from "react";
import { motion } from "framer-motion";
import Prism from "@/components/Prism";

const AnimatedBackground = () => {
  const particles = useMemo(
    () =>
      [...Array(24)].map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        duration: Math.random() * 20 + 20,
        delay: Math.random() * -20,
      })),
    []
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
      {/* ── Background Auroras ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* ── Fullscreen Prism Effect ── */}
      <div className="absolute inset-0 w-full h-full opacity-60 flex items-center justify-center pointer-events-none scale-125 md:scale-100">
        <Prism
          animationType="rotate"
          timeScale={0.4}
          height={4.5}
          baseWidth={6.5}
          scale={5.0}
          hueShift={0}
          colorFrequency={1.2}
          noise={0.1}
          glow={1.2}
        />
      </div>

      {/* ── Floating Particles ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-cyan-400"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 40 - 20, 0],
              opacity: [p.opacity, p.opacity * 2.5, p.opacity],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;
