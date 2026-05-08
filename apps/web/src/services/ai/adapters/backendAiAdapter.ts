import { createHttpAiAdapter } from "./httpAiAdapter";
import type { AIClient, ProviderHttpConfig } from "../types";

export const createBackendAiAdapter = (
  config: ProviderHttpConfig,
): AIClient => {
  return createHttpAiAdapter(config);
};
