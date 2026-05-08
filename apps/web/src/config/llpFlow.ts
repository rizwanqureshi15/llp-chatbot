import type { LlpFormData, LlpFormMarker } from "../types/chat";

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
