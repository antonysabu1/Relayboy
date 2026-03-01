import { motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import PageTransition from "@/components/PageTransition";
import type { ReactNode } from "react";

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
  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className={`w-full ${maxWidthClassName}`}>
          <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-2xl shadow-xl glow-primary mb-4">
              {icon}
            </div>
            <h1 className="text-4xl font-display font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground text-sm font-medium">{subtitle}</p>
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
