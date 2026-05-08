import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface LlpNameFormValue {
  proposed_llp_name: string;
  alternative_llp_names: string[];
}

interface Props {
  disabled?: boolean;
  initialValue?: Partial<LlpNameFormValue>;
  onSubmit: (value: LlpNameFormValue) => void;
}

export default function LlpNameForm({
  disabled = false,
  initialValue,
  onSubmit,
}: Props) {
  const [preferredName, setPreferredName] = useState(
    initialValue?.proposed_llp_name || "",
  );
  const [alternativeName1, setAlternativeName1] = useState(
    initialValue?.alternative_llp_names?.[0] || "",
  );
  const [alternativeName2, setAlternativeName2] = useState(
    initialValue?.alternative_llp_names?.[1] || "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const normalizedPreferredName = preferredName.trim();

    if (!normalizedPreferredName) {
      setError("Preferred LLP name is required.");
      return;
    }

    setError(null);
    onSubmit({
      proposed_llp_name: normalizedPreferredName,
      alternative_llp_names: [alternativeName1, alternativeName2]
        .map((value) => value.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="size-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          LLP name preferences
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground/75">
            Preferred LLP name *
          </label>
          <Input
            value={preferredName}
            onChange={(event) => setPreferredName(event.target.value)}
            placeholder="e.g. TechBridge Ventures LLP"
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground/75">
            Alternative name 1
          </label>
          <Input
            value={alternativeName1}
            onChange={(event) => setAlternativeName1(event.target.value)}
            placeholder="Optional backup LLP name"
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground/75">
            Alternative name 2
          </label>
          <Input
            value={alternativeName2}
            onChange={(event) => setAlternativeName2(event.target.value)}
            placeholder="Optional backup LLP name"
            className="mt-1"
            disabled={disabled}
          />
        </div>
      </div>

      {error && <div className="mt-3 text-sm font-medium text-destructive">{error}</div>}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSubmit} disabled={disabled}>
          Save Names
        </Button>
      </div>
    </div>
  );
}
