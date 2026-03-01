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
  username,
  avatarUrl,
  isOnline = false,
  isActive = false,
  unreadCount = 0,
  onClick,
}: UserListItemProps) {
  return (
    <motion.button
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 border text-left",
        isActive
          ? "bg-primary/12 border-primary/35"
          : "bg-card/40 border-border/60 hover:bg-card/70"
      )}
    >
      <AvatarBadge name={username} avatarUrl={avatarUrl} isOnline={isOnline} size="sm" />

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-foreground")}>{username}</p>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{isOnline ? "Online" : "Offline"}</p>
      </div>

      {unreadCount > 0 && !isActive ? (
        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-lg">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </motion.button>
  );
}
