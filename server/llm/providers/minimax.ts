/**
 * MiniMax Provider
 * 
 * Implementation for MiniMax's chat completions API.
 * MiniMax uses an OpenAI-compatible API format.
 */

import { OpenAICompatibleProvider, type OpenAICompatibleConfig } from "./base";

export interface MiniMaxConfig extends OpenAICompatibleConfig {
  /** MiniMax group ID (required for some endpoints) */
  groupId?: string;
}

export class MiniMaxProvider extends OpenAICompatibleProvider {
  readonly name = "minimax";
  
  private groupId?: string;

  constructor(config: Partial<MiniMaxConfig> = {}) {
    super({
      apiKey: config.apiKey || process.env.MINIMAX_API_KEY || "",
      baseUrl: config.baseUrl,
      model: config.model,
      maxTokens: config.maxTokens,
      headers: config.headers,
      options: config.options,
    });
    this.groupId = config.groupId || process.env.MINIMAX_GROUP_ID;
  }

  protected getDefaultBaseUrl(): string {
    // MiniMax API endpoint - use the global endpoint
    return "https://api.minimax.chat";
  }

  protected getDefaultModel(): string {
    // MiniMax's latest model
    return "abab6.5s-chat";
  }

  /**
   * Override the API URL to include the group ID if needed.
   */
  protected getApiUrl(): string {
    const baseUrl = this.config.baseUrl?.replace(/\/$/, "") || this.getDefaultBaseUrl();
    
    // MiniMax uses /v1/text/chatcompletion_v2 endpoint
    if (this.groupId) {
      return `${baseUrl}/v1/text/chatcompletion_v2?GroupId=${this.groupId}`;
    }
    
    return `${baseUrl}/v1/text/chatcompletion_v2`;
  }

  /**
   * Check if the provider is properly configured.
   */
  isConfigured(): boolean {
    return Boolean(this.config.apiKey || process.env.MINIMAX_API_KEY);
  }
}

/**
 * Create a MiniMax provider instance with environment-based configuration.
 */
export function createMiniMaxProvider(): MiniMaxProvider {
  return new MiniMaxProvider({
    apiKey: process.env.MINIMAX_API_KEY || process.env.LLM_API_KEY,
    baseUrl: process.env.MINIMAX_API_URL || process.env.LLM_API_URL,
    model: process.env.LLM_MODEL,
    groupId: process.env.MINIMAX_GROUP_ID,
  });
}
