import { useState, useEffect, useCallback } from "react";

export type LLMProvider = "openai" | "anthropic" | "minimax" | "ollama";

export interface LLMSettings {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

const LLM_STORAGE_KEY = "llm-settings";

const DEFAULT_MODELS: Record<LLMProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-haiku-20240307",
  ],
  minimax: ["abab6.5s-chat", "abab5.5-chat"],
  ollama: ["llama3", "mistral", "codellama", "phi"],
};

const DEFAULT_SETTINGS: LLMSettings = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o",
};

function loadSettings(): LLMSettings {
  try {
    const stored = localStorage.getItem(LLM_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        provider: parsed.provider || DEFAULT_SETTINGS.provider,
        apiKey: parsed.apiKey || DEFAULT_SETTINGS.apiKey,
        model: parsed.model || DEFAULT_SETTINGS.model,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: LLMSettings): void {
  localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(settings));
}

export function useLLMSettings() {
  const [settings, setSettings] = useState<LLMSettings>(loadSettings);

  // Sync with localStorage on mount
  useEffect(() => {
    const storedSettings = loadSettings();
    setSettings(storedSettings);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<LLMSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };

      // If provider changed, reset to default model for that provider
      if (newSettings.provider && newSettings.provider !== prev.provider) {
        updated.model = DEFAULT_MODELS[newSettings.provider][0];
      }

      saveSettings(updated);
      return updated;
    });
  }, []);

  const getModelsForProvider = useCallback(
    (provider: LLMProvider): string[] => {
      return DEFAULT_MODELS[provider] || [];
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    getModelsForProvider,
    resetSettings,
    providers: ["openai", "anthropic", "minimax", "ollama"] as LLMProvider[],
  };
}
