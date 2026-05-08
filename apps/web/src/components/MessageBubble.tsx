import type { Message } from "../types/chat";
import { cn } from "../lib/utils";

interface Props {
  message: Message;
}

type SummaryRow = {
  label: string;
  value: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const LLP_SUMMARY_HEADING_REGEX = /\*\*\s*llp registration summary\s*\*\*/i;
const JSON_FENCE_REGEX = /```json[\s\S]*?```/gi;

const toLabel = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const formatRecordForDisplay = (record: Record<string, unknown>): string => {
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const pan = typeof record.pan === "string" ? record.pan.trim() : "";
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const contact = typeof record.contact === "string" ? record.contact.trim() : "";

  const parts = [name, pan && `PAN: ${pan}`, contact && `Contact: ${contact}`, email && `Email: ${email}`]
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  try {
    return JSON.stringify(record);
  } catch {
    return "-";
  }
};

const toText = (value: unknown, fallback = "-"): string => {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : fallback;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (isRecord(item)) {
          return formatRecordForDisplay(item);
        }

        return String(item);
      })
      .filter(Boolean);

    return items.length > 0 ? items.join(", ") : fallback;
  }

  if (isRecord(value)) {
    return formatRecordForDisplay(value);
  }

  return fallback;
};

const parseSummaryRowsFromText = (text: string): SummaryRow[] => {
  const withoutJson = text.replace(JSON_FENCE_REGEX, " ");
  const compact = withoutJson.replace(/\s+/g, " ").trim();
  const rows: SummaryRow[] = [];

  const pattern = /(?:^|\s)[-*•]\s*\*\*([^*]+?)\*\*:\s*([\s\S]*?)(?=(?:\s[-*•]\s*\*\*)|$)/g;
  let match = pattern.exec(compact);

  while (match) {
    const label = toLabel(match[1] || "");
    const value = (match[2] || "").trim();

    if (label) {
      rows.push({
        label,
        value: value || "-",
      });
    }

    match = pattern.exec(compact);
  }

  return rows;
};

const extractJsonFromSummaryText = (text: string): unknown | null => {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const getLlpSummaryRows = (data: unknown): SummaryRow[] => {
  if (!isRecord(data)) {
    return [];
  }

  return [
    { label: "Applicant Name", value: toText(data.applicant_name) },
    { label: "Email", value: toText(data.email) },
    { label: "Phone", value: toText(data.phone) },
    { label: "Proposed LLP Name", value: toText(data.proposed_llp_name) },
    {
      label: "Alternative LLP Names",
      value: toText(data.alternative_llp_names, "None"),
    },
    { label: "Business Activity", value: toText(data.business_activity) },
    {
      label: "Address Line 1",
      value: toText(data.registered_office_address_line1),
    },
    {
      label: "Address Line 2",
      value: toText(data.registered_office_address_line2, "NA"),
    },
    { label: "City", value: toText(data.registered_office_city) },
    { label: "State", value: toText(data.registered_office_state) },
    { label: "Country", value: toText(data.registered_office_country) },
    {
      label: "ZIP Code",
      value: toText(data.registered_office_zip_code),
    },
    { label: "Total Partners", value: toText(data.total_partners) },
    { label: "Designated Partners", value: toText(data.designated_partners) },
    { label: "Partner Details", value: toText(data.partner_details) },
    {
      label: "Capital Contribution",
      value: toText(data.capital_contribution),
    },
    {
      label: "Agreement Required",
      value: toText(data.agreement_required),
    },
    { label: "Notes", value: toText(data.notes) },
  ];
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.sender === "user";
  const isJsonMessage = message.type === "json";
  const summaryRows = isJsonMessage ? getLlpSummaryRows(message.jsonData) : [];
  const looksLikeLlpSummaryText =
    !isJsonMessage &&
    message.sender === "bot" &&
    LLP_SUMMARY_HEADING_REGEX.test(message.text);
  const summaryRowsFromText = looksLikeLlpSummaryText
    ? parseSummaryRowsFromText(message.text)
    : [];
  const summaryRowsFromEmbeddedJson =
    !isJsonMessage && looksLikeLlpSummaryText && summaryRowsFromText.length === 0
      ? getLlpSummaryRows(extractJsonFromSummaryText(message.text))
      : [];
  const effectiveRows = isJsonMessage
    ? summaryRows
    : summaryRowsFromText.length > 0
      ? summaryRowsFromText
      : summaryRowsFromEmbeddedJson;
  const renderSummaryCard = isJsonMessage || looksLikeLlpSummaryText;

  return (
    <div className={cn("mb-2.5 flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[72%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-card-foreground",
          isJsonMessage ? "whitespace-pre-wrap" : "whitespace-normal",
        )}
      >
        {renderSummaryCard ? (
          <>
            <div className="mb-2 font-semibold">
              {isJsonMessage ? message.text : "LLP Registration Summary"}
            </div>

            {effectiveRows.length > 0 && (
              <div className="mb-3 rounded-xl border border-border bg-muted/40 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  LLP Summary
                </div>
                <div className="space-y-1.5 text-sm leading-5">
                  {effectiveRows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[150px_1fr] gap-2">
                      <span className="font-medium text-foreground/80">{row.label}</span>
                      <span className="text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {effectiveRows.length === 0 && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Summary unavailable.
              </div>
            )}
          </>
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}