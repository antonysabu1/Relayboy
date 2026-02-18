import { cn } from "@/lib/utils";

interface AvatarBadgeProps {
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export function AvatarBadge({ name, avatarUrl, isOnline = false, size = "md", className }: AvatarBadgeProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "gradient-primary rounded-full flex items-center justify-center font-semibold text-primary-foreground shadow-lg overflow-hidden",
          sizeClasses[size]
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-background" />
      )}
    </div>
  );
}
