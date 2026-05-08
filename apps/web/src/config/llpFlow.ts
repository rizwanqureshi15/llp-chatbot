import type { LlpFormData, LlpFormMarker, LlpQuestionStep } from "../types/chat";

const FORM_MARKER_REGEX = /<!--FORM:([a-z_]+)-->/i;

export const OFF_TOPIC_INPUT_KEYWORDS: string[] = [
	"movie",
	"cricket",
	"football",
	"recipe",
	"joke",
	"bitcoin",
	"politics",
	"dating",
	"game",
	"music",
	"weather",
	"travel",
	"celebrity",
	"netflix",
	"youtube",
];

const escapeRegex = (value: string): string => {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const isLikelyOffTopicInput = (value: string): boolean => {
	const normalized = value.trim().toLowerCase();

	if (!normalized) {
		return false;
	}

	return OFF_TOPIC_INPUT_KEYWORDS.some((keyword) => {
		const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
		return pattern.test(normalized);
	});
};

export const LLP_QUESTIONS: LlpQuestionStep[] = [
	{
		field: "applicant_name",
		marker: "applicant_name",
		question: "What is your full name?",
		placeholder: "Enter applicant full name",
	},
	{
		field: "email",
		marker: "email",
		question: "Please share your email address.",
		placeholder: "name@example.com",
	},
	{
		field: "phone",
		marker: "phone",
		question: "What is your mobile number?",
		placeholder: "10 digit mobile number",
	},
	{
		field: "proposed_llp_name",
		marker: "llp_name_preferences",
		question: "What LLP name do you want to register?",
		placeholder: "Example: TechBridge Ventures LLP",
	},
	{
		field: "business_activity",
		marker: "business_activity",
		question: "What is the main business activity of the LLP?",
		placeholder: "Example: IT consulting and software services",
	},
	{
		field: "registered_office_address_line1",
		marker: "registered_office_details",
		question: "Please share the registered office details.",
		placeholder: "House number, street, area",
	},
	{
		field: "total_partners",
		marker: "total_partners",
		question: "How many total partners will the LLP have?",
		placeholder: "Example: 2",
	},
	{
		field: "designated_partners",
		marker: "designated_partners",
		question: "How many designated partners will there be?",
		placeholder: "Example: 2",
	},
	{
		field: "partner_details",
		marker: "partner_details",
		question:
			"Enter partner names separated by commas. (Example: Aisha Khan, Raj Mehta)",
		placeholder: "Partner names separated by commas",
	},
	{
		field: "capital_contribution",
		marker: "capital_contribution",
		question: "What is the expected total capital contribution amount (INR)?",
		placeholder: "Example: 100000",
	},
	{
		field: "agreement_required",
		marker: "agreement_required",
		question: "Do you need help drafting the LLP agreement?",
		options: ["Yes", "No"],
	},
	{
		field: "notes",
		marker: "notes",
		question: "Any additional notes or requirements? If none, type 'None'.",
		placeholder: "Any special requirements",
	},
];

export const getLlpQuestionByMarker = (
	marker: LlpFormMarker,
): LlpQuestionStep | undefined => {
	return LLP_QUESTIONS.find((step) => step.marker === marker);
};

export const getLlpStepIndexByMarker = (marker: LlpFormMarker): number => {
	return LLP_QUESTIONS.findIndex((step) => step.marker === marker);
};

export const extractFormMarker = (
	text: string,
): { cleanedText: string; marker: LlpFormMarker | null } => {
	const match = text.match(FORM_MARKER_REGEX);

	if (!match) {
		return {
			cleanedText: text.trim(),
			marker: null,
		};
	}

	return {
		cleanedText: text.replace(FORM_MARKER_REGEX, "").trim(),
		marker: match[1] as LlpFormMarker,
	};
};

export const createInitialLlpData = (): LlpFormData => ({
	applicant_name: "",
	email: "",
	phone: "",
	proposed_llp_name: "",
	alternative_llp_names: [],
	business_activity: "",
	registered_office_address_line1: "",
	registered_office_address_line2: "",
	registered_office_city: "",
	registered_office_state: "",
	registered_office_country: "",
	registered_office_zip_code: "",
	total_partners: 0,
	designated_partners: 0,
	partner_details: [],
	capital_contribution: 0,
	agreement_required: false,
	timeline: "",
	notes: "",
});
