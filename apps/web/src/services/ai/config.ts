import type { AIClientConfig, AIProvider } from "./types";

const DEFAULT_API_BASE_URL = "http://localhost:3000/api";

const parseProvider = (value: string | undefined): AIProvider => {
  const normalizedValue = value?.trim().toLowerCase();

  if (
    normalizedValue === "openai" ||
    normalizedValue === "mistral" ||
    normalizedValue === "backend"
  ) {
    return normalizedValue;
  }

  return "mistral";
};

export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
};

export const getAiClientConfig = (): AIClientConfig => {
  const apiBaseUrl = getApiBaseUrl();

  return {
    provider: parseProvider(import.meta.env.VITE_AI_PROVIDER),
    providers: {
      backend: {
        baseUrl: apiBaseUrl,
      },
      openai: {
        baseUrl:
          import.meta.env.VITE_OPENAI_ADAPTER_BASE_URL ||
          `${apiBaseUrl}/providers/openai`,
      },
      mistral: {
        baseUrl:
          import.meta.env.VITE_MISTRAL_ADAPTER_BASE_URL ||
          `${apiBaseUrl}/providers/mistral`,
      },
    },
  };
};
