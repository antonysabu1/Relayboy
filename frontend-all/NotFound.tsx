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
        <div className="glass-card quantum-card rounded-[2rem] p-8 sm:p-10 text-center border border-border/70 max-w-lg w-full">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-2">404</h1>
          <p className="text-muted-foreground mb-7">
            Route <span className="text-primary font-semibold">{location.pathname}</span> does not exist.
          </p>
          <Link to="/">
            <Button className="gradient-primary text-primary-foreground rounded-xl h-11 px-6 font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
};

export default NotFound;
