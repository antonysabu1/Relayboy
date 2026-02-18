import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AvatarBadge } from "@/components/ui/avatar-badge";

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isSent: boolean;
  senderName?: string;
  isSeen?: boolean;
}

export function ChatMessage({ message, timestamp, isSent, senderName, isSeen }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "flex gap-3 max-w-[85%] mb-2",
        isSent ? "flex-row-reverse self-end" : "flex-row self-start"
      )}
    >
      {!isSent && (
        <div className="shrink-0 self-end mb-6">
          <AvatarBadge name={senderName || "?"} size="sm" className="w-8 h-8 rounded-lg" />
        </div>
      )}

      <div className={cn("flex flex-col", isSent ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-5 py-3 rounded-[22px] shadow-sm transition-all duration-300",
            isSent
              ? "bg-primary text-primary-foreground rounded-br-md dark:shadow-[0_0_20px_rgba(var(--relay-blue-glow),0.3)] light:shadow-md"
              : "bg-muted text-foreground rounded-bl-md light:bg-white light:shadow-[var(--clay-shadow)] dark:bg-zinc-800/80 dark:backdrop-blur-xl dark:border dark:border-white/5"
          )}
        >
          <p className="text-[15px] leading-[1.6]">{message}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 px-2">
          <span className="text-[10px] text-muted-foreground/60 font-semibold">
            {timestamp}
          </span>
          {isSent && (
            <div className={cn(
              "flex items-center text-[10px]",
              isSeen ? "text-primary" : "text-muted-foreground/40"
            )}>
              {isSeen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-7.5 7.5L13 16"></path></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
