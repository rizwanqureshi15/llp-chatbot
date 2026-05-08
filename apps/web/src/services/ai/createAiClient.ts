import { createBackendAiAdapter } from "./adapters/backendAiAdapter";
import { createMistralAdapter } from "./adapters/mistralAiAdapter";
import { createOpenAiAdapter } from "./adapters/openAiAdapter";
import type { AIClient, AIClientConfig } from "./types";

export const createAiClient = (config: AIClientConfig): AIClient => {
  switch (config.provider) {
    case "openai":
      return createOpenAiAdapter(config.providers.openai);
    case "mistral":
      return createMistralAdapter(config.providers.mistral);
    case "backend":
    default:
      return createBackendAiAdapter(config.providers.backend);
  }
};
