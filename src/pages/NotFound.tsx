import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
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
        <div className="glass-card quantum-card rounded-[2.5rem] p-10 text-center border border-white/10 max-w-lg w-full">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-xl glow-primary">
            <AlertTriangle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-3">404</h1>
          <p className="text-muted-foreground mb-8">
            This relay node does not exist. The path <span className="text-primary font-semibold">{location.pathname}</span> is offline.
          </p>
          <Link to="/">
            <Button className="gradient-primary hover:opacity-90 transition-all hover:scale-105 shadow-lg glow-primary rounded-2xl h-12 px-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
};

export default NotFound;
