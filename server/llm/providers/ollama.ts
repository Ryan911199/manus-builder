/**
 * Ollama Provider
 * 
 * Implementation for Ollama's local LLM API.
 * Ollama provides an OpenAI-compatible API at /v1/chat/completions.
 * No API key required since it runs locally.
 */

import { OpenAICompatibleProvider, type OpenAICompatibleConfig } from "./base";

export class OllamaProvider extends OpenAICompatibleProvider {
  readonly name = "ollama";

  constructor(config: Partial<OpenAICompatibleConfig> = {}) {
    super({
      // Ollama doesn't require an API key
      apiKey: config.apiKey || "ollama",
      baseUrl: config.baseUrl,
      model: config.model,
      maxTokens: config.maxTokens,
      headers: config.headers,
      options: config.options,
    });
  }

  protected getDefaultBaseUrl(): string {
    // Ollama runs locally by default
    return process.env.OLLAMA_HOST || "http://localhost:11434";
  }

  protected getDefaultModel(): string {
    return "llama2";
  }

  /**
   * Ollama is always "configured" since it doesn't require an API key.
   * The real check is whether Ollama is running locally.
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Override buildHeaders to not require Bearer auth.
   */
  protected buildHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      ...this.config.headers,
    };
  }

  /**
   * List available models from Ollama.
   * Ollama has a /api/tags endpoint that returns installed models.
   */
  async listModels(): Promise<string[]> {
    try {
      const baseUrl = this.config.baseUrl?.replace(/\/$/, "") || this.getDefaultBaseUrl();
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      return data.models?.map(m => m.name) || [];
    } catch (error) {
      // If Ollama is not running, return empty list
      console.warn(`[${this.name}] Could not list models:`, error);
      return [];
    }
  }
}

/**
 * Create an Ollama provider instance with environment-based configuration.
 */
export function createOllamaProvider(): OllamaProvider {
  return new OllamaProvider({
    baseUrl: process.env.OLLAMA_HOST || process.env.LLM_API_URL,
    model: process.env.LLM_MODEL,
  });
}
