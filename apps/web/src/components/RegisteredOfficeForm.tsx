import { useState } from "react";
import { MapPinHouse } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface RegisteredOfficeFormValue {
  registered_office_address_line1: string;
  registered_office_address_line2: string;
  registered_office_city: string;
  registered_office_state: string;
  registered_office_country: string;
  registered_office_zip_code: string;
}

interface Props {
  disabled?: boolean;
  initialValue?: Partial<RegisteredOfficeFormValue>;
  onSubmit: (value: RegisteredOfficeFormValue) => void;
}

export default function RegisteredOfficeForm({
  disabled = false,
  initialValue,
  onSubmit,
}: Props) {
  const [addressLine1, setAddressLine1] = useState(
    initialValue?.registered_office_address_line1 || "",
  );
  const [addressLine2, setAddressLine2] = useState(
    initialValue?.registered_office_address_line2 || "",
  );
  const [city, setCity] = useState(initialValue?.registered_office_city || "");
  const [state, setState] = useState(initialValue?.registered_office_state || "");
  const [country, setCountry] = useState(
    initialValue?.registered_office_country || "",
  );
  const [zipCode, setZipCode] = useState(
    initialValue?.registered_office_zip_code || "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const normalizedLine1 = addressLine1.trim();
    const normalizedLine2 = addressLine2.trim();
    const normalizedCity = city.trim();
    const normalizedState = state.trim();
    const normalizedCountry = country.trim();
    const normalizedZipCode = zipCode.trim();

    if (!normalizedLine1 || !normalizedCity || !normalizedState || !normalizedCountry || !normalizedZipCode) {
      setError("Address line 1, city, state, country, and ZIP code are required.");
      return;
    }

    if (!/^[A-Za-z0-9\-\s]{4,10}$/.test(normalizedZipCode)) {
      setError("ZIP/Postal code should be 4 to 10 characters.");
      return;
    }

    setError(null);
    onSubmit({
      registered_office_address_line1: normalizedLine1,
      registered_office_address_line2: normalizedLine2,
      registered_office_city: normalizedCity,
      registered_office_state: normalizedState,
      registered_office_country: normalizedCountry,
      registered_office_zip_code: normalizedZipCode,
    });
  };

  return (
    <div className="mt-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MapPinHouse className="size-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Registered office details</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-foreground/75">Address line 1 *</label>
          <Input
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            placeholder="House number, street, area"
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-medium text-foreground/75">Address line 2</label>
          <Input
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
            placeholder="Building, landmark, locality (optional)"
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground/75">City *</label>
          <Input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="City"
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground/75">State *</label>
          <Input
            value={state}
            onChange={(event) => setState(event.target.value)}
            placeholder="State"
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground/75">Country *</label>
          <Input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Country"
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground/75">ZIP Code *</label>
          <Input
            value={zipCode}
            onChange={(event) => setZipCode(event.target.value)}
            placeholder="ZIP / Postal code"
            className="mt-1"
            disabled={disabled}
          />
        </div>
      </div>

      {error && <div className="mt-3 text-sm font-medium text-destructive">{error}</div>}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSubmit} disabled={disabled}>
          Save Office Details
        </Button>
      </div>
    </div>
  );
}
