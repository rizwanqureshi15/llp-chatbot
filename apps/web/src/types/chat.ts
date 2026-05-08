export type Sender = "user" | "bot";

export type MessageType = "text" | "json";

export interface Message {
  sender: Sender;
  text: string;
  type?: MessageType;
  jsonData?: unknown;
}

export interface StartChatResponse {
  session_id: string;
  question: string;
  options?: string[];
}

export interface AnswerResponse {
  question?: string;
  options?: string[];
  completed?: boolean;
  data?: Record<string, any>;
}

export interface ChatHistoryMessage {
  sender: Sender;
  text: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatHistoryMessage[];
}

export interface LlpFormData {
  applicant_name: string;
  email: string;
  phone: string;
  proposed_llp_name: string;
  alternative_llp_names: string[];
  business_activity: string;
  registered_office_address_line1: string;
  registered_office_address_line2: string;
  registered_office_city: string;
  registered_office_state: string;
  registered_office_country: string;
  registered_office_zip_code: string;
  total_partners: number;
  designated_partners: number;
  partner_details: string[];
  capital_contribution: number;
  agreement_required: boolean;
  timeline: string;
  notes: string;
}

export type LlpFieldKey = keyof LlpFormData;

export type LlpFormMarker =
  | "applicant_name"
  | "email"
  | "phone"
  | "llp_name_preferences"
  | "business_activity"
  | "registered_office_details"
  | "total_partners"
  | "designated_partners"
  | "partner_details"
  | "capital_contribution"
  | "agreement_required"
  | "notes";

export interface LlpQuestionStep {
  field: LlpFieldKey;
  marker: LlpFormMarker;
  question: string;
  placeholder?: string;
  options?: string[];
}

export interface PersistedChatState {
  messages: Message[];
  currentStep: number;
  aiSessionId: string | null;
  formData: Partial<LlpFormData>;
  completed: boolean;
  submitStatus: "idle" | "submitting" | "success" | "error";
  submitError: string | null;
}

export interface SubmitLlpPayload {
  data: LlpFormData;
  submitted_at: string;
}

export interface SubmitLlpResponse {
  success: boolean;
  id?: string;
  message?: string;
}