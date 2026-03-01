import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AvatarBadge } from "@/components/ui/avatar-badge";

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isSent: boolean;
  senderName?: string;
  isSeen?: boolean;
  deliveryStatus?: "sending" | "delivered" | "seen" | "failed";
}

export function ChatMessage({ message, timestamp, isSent, senderName, isSeen, deliveryStatus }: ChatMessageProps) {
  const status = deliveryStatus || (isSeen ? "seen" : "delivered");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 max-w-[86%]", isSent ? "self-end flex-row-reverse" : "self-start")}
    >
      {!isSent ? (
        <div className="shrink-0 self-end mb-5">
          <AvatarBadge name={senderName || "?"} size="sm" className="w-8 h-8" />
        </div>
      ) : null}

      <div className={cn("flex flex-col", isSent ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl border text-sm leading-relaxed",
            isSent
              ? "bg-chat-sent text-primary-foreground border-primary/40 rounded-br-sm"
              : "bg-chat-received text-foreground border-border/80 rounded-bl-sm"
          )}
        >
          {message}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 px-2">
          <span className="text-[10px] text-muted-foreground/60 font-semibold">
            {timestamp}
          </span>
          {isSent && (
            <div className={cn(
              "flex items-center text-[10px]",
              status === "seen" ? "text-primary" : status === "failed" ? "text-destructive" : "text-muted-foreground/60"
            )}>
              {status === "seen" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-7.5 7.5L13 16"></path></svg>
              ) : status === "sending" ? (
                <span className="font-semibold">Sending</span>
              ) : status === "failed" ? (
                <span className="font-semibold">Failed</span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                  <span className="ml-1 font-semibold">Delivered</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
