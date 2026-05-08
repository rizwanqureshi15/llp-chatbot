import type { AnswerResponse, StartChatResponse } from "../../types/chat";

export type AIProvider = "backend" | "openai" | "mistral";

export interface SendAnswerRequest {
  session_id: string;
  answer: string;
  system_prompt?: string;
}

export interface AIClient {
  startChat(): Promise<StartChatResponse>;
  sendAnswer(payload: SendAnswerRequest): Promise<AnswerResponse>;
}

export interface ProviderHttpConfig {
  baseUrl: string;
  startPath?: string;
  answerPath?: string;
  headers?: Record<string, string>;
}

export interface AIClientConfig {
  provider: AIProvider;
  providers: Record<AIProvider, ProviderHttpConfig>;
}
