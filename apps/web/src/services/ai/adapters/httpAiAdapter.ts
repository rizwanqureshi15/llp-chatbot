import type { AnswerResponse, StartChatResponse } from "../../../types/chat";
import type { AIClient, ProviderHttpConfig, SendAnswerRequest } from "../types";

const joinUrl = (baseUrl: string, path: string): string => {
  const sanitizedBase = baseUrl.replace(/\/$/, "");
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${sanitizedBase}${sanitizedPath}`;
};

const requestJson = async <T>(
  url: string,
  init: RequestInit,
): Promise<T> => {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const defaultMessage = `Request failed (${response.status})`;
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : defaultMessage;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Empty response received from AI provider endpoint.");
  }

  return payload;
};

export const createHttpAiAdapter = (config: ProviderHttpConfig): AIClient => {
  const startPath = config.startPath || "/chat/start";
  const answerPath = config.answerPath || "/chat/answer";

  const withHeaders = (headers?: Record<string, string>): HeadersInit => ({
    "Content-Type": "application/json",
    ...config.headers,
    ...headers,
  });

  return {
    async startChat(): Promise<StartChatResponse> {
      return requestJson<StartChatResponse>(joinUrl(config.baseUrl, startPath), {
        method: "POST",
        headers: withHeaders(),
      });
    },

    async sendAnswer(payload: SendAnswerRequest): Promise<AnswerResponse> {
      return requestJson<AnswerResponse>(joinUrl(config.baseUrl, answerPath), {
        method: "POST",
        headers: withHeaders(),
        body: JSON.stringify(payload),
      });
    },
  };
};
