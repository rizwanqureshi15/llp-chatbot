import { Button } from "./ui/button";

interface Props {
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({
  options,
  onSelect,
  disabled = false,
}: Props) {
  return (
    <div className="mb-1 mt-3 flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt}
          onClick={() => onSelect(opt)}
          disabled={disabled}
          variant="secondary"
          size="sm"
          className="rounded-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
        >
          {opt}
        </Button>
      ))}
    </div>
  );
}