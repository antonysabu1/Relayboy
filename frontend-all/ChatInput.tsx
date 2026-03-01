import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = "Type your message..." }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const next = message.trim();
    if (!next || disabled) return;
    onSend(next);
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex items-center gap-2 p-2 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-11 bg-transparent border-none focus-visible:ring-0 px-3 text-sm placeholder:text-muted-foreground"
      />

      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground"
      >
        <Send className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}
