/**
 * LLM Provider Abstraction Types
 * 
 * This module defines the interfaces for LLM providers, enabling support
 * for multiple backends (OpenAI, Anthropic, MiniMax, Ollama, etc.)
 */

// ============================================================================
// Message Types
// ============================================================================

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

// ============================================================================
// Tool Types
// ============================================================================

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

// ============================================================================
// Schema & Response Format Types
// ============================================================================

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// ============================================================================
// Invoke Parameters & Result
// ============================================================================

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /** Optional model override - uses provider's default if not specified */
  model?: string;
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ============================================================================
// Provider Configuration
// ============================================================================

export type ProviderConfig = {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API (optional, uses provider default) */
  baseUrl?: string;
  /** Default model to use (optional, uses provider default) */
  model?: string;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
};

// ============================================================================
// LLM Provider Interface
// ============================================================================

/**
 * Interface that all LLM providers must implement.
 * Providers handle the actual communication with LLM APIs.
 */
export interface LLMProvider {
  /** Unique name identifying this provider (e.g., "openai", "anthropic") */
  readonly name: string;
  
  /**
   * Invoke the LLM with the given parameters.
   * This is the main method for generating completions.
   */
  invoke(params: InvokeParams): Promise<InvokeResult>;
  
  /**
   * List available models for this provider (optional).
   * Not all providers support this.
   */
  listModels?(): Promise<string[]>;
  
  /**
   * Check if the provider is properly configured and ready to use.
   */
  isConfigured(): boolean;
}
