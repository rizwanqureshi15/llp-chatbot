import type { PersistedChatState } from "../types/chat";

const CHAT_STORAGE_KEY = "llp_chat_prototype_v1";

export const saveChatState = (state: PersistedChatState): void => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to persist chat state:", error);
  }
};

export const loadChatState = (): PersistedChatState | null => {
  try {
    const rawState = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    return JSON.parse(rawState) as PersistedChatState;
  } catch (error) {
    console.error("Failed to read chat state:", error);
    return null;
  }
};

export const clearChatState = (): void => {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear chat state:", error);
  }
};
