import { useMemo } from "react";
import { motion } from "framer-motion";
import Prism from "@/components/Prism";

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
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* ── Prism WebGL background layer ── */}
      <div className="absolute inset-0 w-full h-full opacity-100 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-[1400px] h-[800px] relative">
          <Prism
            animationType="rotate"
            timeScale={0.5}
            height={3.5}
            baseWidth={5.5}
            scale={3.6}
            hueShift={0}
            colorFrequency={1}
            noise={0}
            glow={1}
          />
        </div>
      </div>

      {/* ── Subtle dark overlay (reduced to allow prism to shine) ── */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;
