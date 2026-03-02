import { motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import { GlobalSpotlight } from "@/components/MagicBento";
import PageTransition from "@/components/PageTransition";
import { ReactNode, useRef } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}

export default function AuthShell({
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidthClassName = "max-w-md",
}: AuthShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10 bento-section" ref={shellRef}>
        <div className={`w-full ${maxWidthClassName} relative z-20`}>
          <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8 pointer-events-none">
            <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl shadow-[0_0_20px_rgba(0,219,255,0.4)] glow-primary mb-4 p-4 border border-cyan-400/30">
              {icon}
            </div>
            <h1 className="text-4xl font-display font-bold mb-2 text-white drop-shadow-md">{title}</h1>
            <p className="text-cyan-100/70 text-sm font-medium">{subtitle}</p>
          </motion.div>

          {children}

          {footer ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} className="mt-8">
              {footer}
            </motion.div>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
}
