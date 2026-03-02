import { HexagonBackground } from "@/components/ui/hexagon-background";

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-black">
      <HexagonBackground
        className="absolute inset-0 opacity-50"
        hexagonSize={60}
        hexagonMargin={2}
      />

      {/* ── Optional Glass Overlays ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
};

export default AnimatedBackground;
