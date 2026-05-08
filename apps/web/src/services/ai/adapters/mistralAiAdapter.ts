import { createHttpAiAdapter } from "./httpAiAdapter";
import type { AIClient, ProviderHttpConfig } from "../types";

export const createMistralAdapter = (config: ProviderHttpConfig): AIClient => {
  return createHttpAiAdapter(config);
};
