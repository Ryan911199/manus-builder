/**
 * Anthropic Provider
 *
 * Custom implementation for Anthropic's Messages API.
 * Anthropic uses a different API format than OpenAI:
 * - Different endpoint: /v1/messages
 * - Different auth header: x-api-key instead of Authorization Bearer
 * - Different message format: system parameter instead of system role
 * - Different response structure
 */

import type {
  LLMProvider,
  ProviderConfig,
  InvokeParams,
  InvokeResult,
  Message,
  MessageContent,
  TextContent,
} from "../types";

// ============================================================================
// Anthropic-specific Types
// ============================================================================

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicConfig extends ProviderConfig {
  /** Anthropic API version (default: 2023-06-01) */
  anthropicVersion?: string;
  /** Default max tokens for completions */
  maxTokens?: number;
}

// ============================================================================
// Message Conversion Helpers
// ============================================================================

function normalizeContent(
  content: MessageContent | MessageContent[]
): string | AnthropicContentBlock[] {
  const parts = Array.isArray(content) ? content : [content];

  // If all parts are text, concatenate them
  const textParts: string[] = [];
  const complexParts: AnthropicContentBlock[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      textParts.push(part);
    } else if (part.type === "text") {
      textParts.push(part.text);
    } else if (part.type === "image_url") {
      // Convert OpenAI image_url to Anthropic format
      if (!part.image_url?.url) {
        console.warn("[Anthropic] Skipping image_url part with missing URL");
        continue;
      }
      const url = part.image_url.url;
      if (url.startsWith("data:")) {
        // Base64 encoded image
        const [meta, data] = url.split(",");
        const mediaType = meta.match(/data:([^;]+)/)?.[1] || "image/jpeg";
        complexParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: data,
          },
        });
      } else {
        // URL - Anthropic doesn't support URL images directly
        // Convert to a text description instead
        textParts.push(`[Image: ${url}]`);
      }
    }
  }

  // If we have only text, return as string
  if (complexParts.length === 0) {
    return textParts.join("\n");
  }

  // Mix of text and images
  const result: AnthropicContentBlock[] = [];
  if (textParts.length > 0) {
    result.push({ type: "text", text: textParts.join("\n") });
  }
  result.push(...complexParts);
  return result;
}

function convertMessages(messages: Message[]): {
  system?: string;
  messages: AnthropicMessage[];
} {
  let systemPrompt: string | undefined;
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // Anthropic uses a separate system parameter
      const content = normalizeContent(msg.content);
      systemPrompt =
        typeof content === "string"
          ? content
          : content.map(b => b.text || "").join("\n");
    } else if (msg.role === "user" || msg.role === "assistant") {
      anthropicMessages.push({
        role: msg.role,
        content: normalizeContent(msg.content),
      });
    } else if (msg.role === "tool" || msg.role === "function") {
      // Convert tool responses to user messages with context
      const content = normalizeContent(msg.content);
      anthropicMessages.push({
        role: "user",
        content:
          typeof content === "string"
            ? `Tool response (${msg.name || "unknown"}): ${content}`
            : content,
      });
    }
  }

  return { system: systemPrompt, messages: anthropicMessages };
}

function convertResponse(response: AnthropicResponse): InvokeResult {
  // Extract text content from response
  const textContent = response.content
    .filter(block => block.type === "text")
    .map(block => block.text || "")
    .join("");

  return {
    id: response.id,
    created: Date.now(),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent,
        },
        finish_reason: response.stop_reason || "stop",
      },
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

// ============================================================================
// Anthropic Provider Implementation
// ============================================================================

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";

  private config: AnthropicConfig;

  constructor(config: Partial<AnthropicConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || "",
      baseUrl: config.baseUrl,
      model: config.model,
      anthropicVersion: config.anthropicVersion || "2023-06-01",
      maxTokens: config.maxTokens || 4096,
      options: config.options,
    };
  }

  private getApiUrl(): string {
    const baseUrl =
      this.config.baseUrl?.replace(/\/$/, "") || "https://api.anthropic.com";
    return `${baseUrl}/v1/messages`;
  }

  private getDefaultModel(): string {
    return "claude-3-5-sonnet-20241022";
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey || process.env.ANTHROPIC_API_KEY);
  }

  private buildHeaders(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": this.config.anthropicVersion || "2023-06-01",
    };
  }

  async invoke(params: InvokeParams): Promise<InvokeResult> {
    if (!this.isConfigured()) {
      throw new Error(
        `[${this.name}] Provider not configured - missing API key`
      );
    }

    const { system, messages } = convertMessages(params.messages);

    const payload: Record<string, unknown> = {
      model: params.model || this.config.model || this.getDefaultModel(),
      messages,
      max_tokens:
        params.maxTokens || params.max_tokens || this.config.maxTokens || 4096,
    };

    if (system) {
      payload.system = system;
    }

    const response = await fetch(this.getApiUrl(), {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[${this.name}] LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
      );
    }

    const anthropicResponse = (await response.json()) as AnthropicResponse;
    return convertResponse(anthropicResponse);
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  }
}

/**
 * Create an Anthropic provider instance with environment-based configuration.
 */
export function createAnthropicProvider(): AnthropicProvider {
  return new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY,
    baseUrl: process.env.ANTHROPIC_API_URL || process.env.LLM_API_URL,
    model: process.env.LLM_MODEL,
  });
}
