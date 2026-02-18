import { cn } from "@/lib/utils";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { motion } from "framer-motion";

interface UserListItemProps {
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
  isActive?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function UserListItem({
  username, avatarUrl, isOnline = false, isActive = false, unreadCount = 0, onClick
}: UserListItemProps) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 border border-transparent group",
        isActive
          ? "bg-primary/5 border-primary/5"
          : "hover:bg-foreground/5 hover:border-transparent"
      )}
    >
      <div className="relative">
        <AvatarBadge name={username} avatarUrl={avatarUrl} isOnline={isOnline} size="sm" />
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online border-2 border-background rounded-full animate-pulse" />
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <span className={cn(
          "font-semibold text-[15px] block truncate transition-colors",
          isActive ? "text-primary" : "text-foreground"
        )}>
          {username}
        </span>
        <span className="text-[11px] text-muted-foreground/60 font-medium tracking-tight">
          {isOnline ? "Active now" : "Offline"}
        </span>
      </div>
      {unreadCount > 0 && !isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-lg shadow-primary/20"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.div>
      )}
      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="w-1.5 h-1.5 rounded-full bg-primary glow-primary"
        />
      )}
    </motion.button>
  );
}
