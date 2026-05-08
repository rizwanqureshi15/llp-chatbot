import { useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your answer...",
}: Props) {
  const [input, setInput] = useState<string>("");

  const handleSend = () => {
    const nextValue = input.trim();
    if (!nextValue || disabled) return;
    onSend(nextValue);
    setInput("");
  };

  return (
    <div className="border-t border-border/70 bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 shadow-sm">
      <Input
        className="h-11 flex-1"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        disabled={disabled}
      />
      <Button onClick={handleSend} disabled={disabled} size="lg" className="h-11 px-4">
        <SendHorizontal className="size-4" />
        Send
      </Button>
      </div>
    </div>
  );
}