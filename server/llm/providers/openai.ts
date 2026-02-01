/**
 * OpenAI Provider
 * 
 * Implementation for OpenAI's chat completions API.
 * Uses the base OpenAICompatibleProvider since OpenAI is the reference implementation.
 */

import { OpenAICompatibleProvider, type OpenAICompatibleConfig } from "./base";

export class OpenAIProvider extends OpenAICompatibleProvider {
  readonly name = "openai";

  constructor(config: Partial<OpenAICompatibleConfig> = {}) {
    super({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
      baseUrl: config.baseUrl,
      model: config.model,
      maxTokens: config.maxTokens,
      headers: config.headers,
      options: config.options,
    });
  }

  protected getDefaultBaseUrl(): string {
    return "https://api.openai.com";
  }

  protected getDefaultModel(): string {
    return "gpt-4o";
  }

  /**
   * Check if the provider is properly configured.
   */
  isConfigured(): boolean {
    return Boolean(this.config.apiKey || process.env.OPENAI_API_KEY);
  }
}

/**
 * Create an OpenAI provider instance with environment-based configuration.
 */
export function createOpenAIProvider(): OpenAIProvider {
  return new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY,
    baseUrl: process.env.OPENAI_API_URL || process.env.LLM_API_URL,
    model: process.env.LLM_MODEL,
  });
}
