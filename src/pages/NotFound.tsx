import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { ParticleCard } from "@/components/MagicBento";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <ParticleCard className="w-full max-w-lg rounded-[2.5rem] border border-white/10 p-2 bg-black/10 backdrop-blur-md shadow-2xl" enableTilt={true}>
          <div className="relative flex flex-col items-center overflow-hidden rounded-[2rem] p-10 md:p-12 bg-[#0A0F19]/60 border border-white/5 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-2xl">
              <AlertTriangle className="w-10 h-10 text-white/60" strokeWidth={1.5} />
            </div>
            <h1 className="text-6xl font-display font-bold mb-4 text-white tracking-tighter italic">404</h1>
            <p className="text-white/40 mb-10 text-lg font-light max-w-[280px]">
              The requested path <span className="text-cyan-400/80 font-bold font-mono text-sm inline-block px-2 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/20">{location.pathname}</span> was not found in our secure relay net.
            </p>
            <Link to="/" className="w-full">
              <Button className="w-full bg-white text-black font-bold h-14 rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                <ArrowLeft className="w-5 h-5 mr-3" />
                Return to Surface
              </Button>
            </Link>
          </div>
        </ParticleCard>
      </div>
    </PageTransition>
  );
};

export default NotFound;
