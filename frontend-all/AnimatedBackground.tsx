import { useMemo } from "react";
import { motion } from "framer-motion";

const AnimatedBackground = () => {
  const particles = useMemo(
    () =>
      [...Array(12)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        duration: Math.random() * 10 + 10,
        drift: Math.random() * 24 - 12,
      })),
    []
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute -top-24 -left-16 w-[50vw] h-[45vh] bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute -bottom-24 -right-14 w-[50vw] h-[50vh] bg-secondary/20 rounded-full blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.12),transparent_35%),radial-gradient(circle_at_80%_70%,hsl(var(--secondary)/0.12),transparent_40%)]" />

      <div className="absolute top-20 left-10 w-36 h-36 rounded-full border border-border/50 opacity-30 animate-orbit" />
      <div className="absolute bottom-24 right-14 w-44 h-44 rounded-full border border-primary/30 opacity-30 animate-orbit" />

      <div className="absolute inset-0 opacity-30">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-foreground"
            initial={{ x: `${p.x}vw`, y: `${p.y}vh`, opacity: p.opacity }}
            animate={{
              y: [`${p.y}vh`, `${p.y - 8}vh`],
              x: [`${p.x}vw`, `${p.x + p.drift}vw`],
            }}
            transition={{ duration: p.duration, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            style={{ width: `${p.size}px`, height: `${p.size}px` }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(transparent_24px,hsl(var(--border)/0.18)_25px),linear-gradient(90deg,transparent_24px,hsl(var(--border)/0.18)_25px)] bg-[size:25px_25px] opacity-[0.12]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent opacity-[0.06] animate-scan" />
    </div>
  );
};

export default AnimatedBackground;
