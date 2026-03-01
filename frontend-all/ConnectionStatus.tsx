import { Wifi, WifiOff, Loader2 } from "lucide-react";

type ConnectionState = "connecting" | "connected" | "disconnected";

interface ConnectionStatusProps {
  status: ConnectionState;
  username?: string;
}

export function ConnectionStatus({ status, username }: ConnectionStatusProps) {
  if (status === "connecting") {
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-card/60 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span className="text-muted-foreground">Connecting...</span>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-destructive/40 bg-destructive/10 text-xs">
        <WifiOff className="h-3.5 w-3.5 text-destructive" />
        <span className="text-destructive">Disconnected</span>
      </div>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-card/60 text-xs">
      <Wifi className="h-3.5 w-3.5 text-online" />
      <span className="text-muted-foreground">{username ? `Connected as ${username}` : "Connected"}</span>
    </div>
  );
}
