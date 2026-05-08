import type {
  StartChatResponse,
  AnswerResponse,
  ChatHistoryResponse,
  Message,
  SubmitLlpPayload,
  SubmitLlpResponse,
} from "../types/chat";
import { getAiClientConfig, getApiBaseUrl } from "./ai/config";
import { createAiClient } from "./ai/createAiClient";
import { LLP_FORMATION_SYSTEM_PROMPT } from "./ai/systemPrompt";

const BASE_URL = getApiBaseUrl();
const aiClient = createAiClient(getAiClientConfig());

export const startChat = async (): Promise<StartChatResponse> => {
  return aiClient.startChat();
};

export const sendAnswer = async (payload: {
  session_id: string;
  answer: string;
}): Promise<AnswerResponse> => {
  return aiClient.sendAnswer({
    ...payload,
    system_prompt: LLP_FORMATION_SYSTEM_PROMPT,
  });
};

export const fetchChatMessages = async (sessionId: string): Promise<Message[]> => {
  const res = await fetch(`${BASE_URL}/chat/${encodeURIComponent(sessionId)}/messages`, {
    method: "GET",
  });

  const data = (await res.json().catch(() => null)) as ChatHistoryResponse | { message?: string } | null;

  if (!res.ok) {
    const errorMessage =
      data && "message" in data && typeof data.message === "string"
        ? data.message
        : "Failed to fetch chat messages.";
    throw new Error(errorMessage);
  }

  if (!data || !("messages" in data) || !Array.isArray(data.messages)) {
    return [];
  }

  return data.messages;
};

export const submitLlpData = async (
  payload: SubmitLlpPayload,
): Promise<SubmitLlpResponse> => {
  const res = await fetch(`${BASE_URL}/llp/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as SubmitLlpResponse | null;

  if (!res.ok) {
    throw new Error(data?.message || "Failed to submit LLP details.");
  }

  return (
    data || {
      success: true,
      message: "LLP details submitted successfully.",
    }
  );
};