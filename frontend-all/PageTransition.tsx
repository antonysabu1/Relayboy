import { motion } from "framer-motion";

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`min-h-[100dvh] w-full ${className}`}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
