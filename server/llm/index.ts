/**
 * LLM Provider Abstraction
 * 
 * This module provides a unified interface for working with multiple LLM providers.
 * 
 * Usage:
 * ```typescript
 * import { getRegistry, invokeLLM } from "./llm";
 * 
 * // Use the default provider
 * const result = await invokeLLM({ messages: [...] });
 * 
 * // Or use a specific provider
 * const provider = getRegistry().get("anthropic");
 * const result = await provider?.invoke({ messages: [...] });
 * ```
 */

// Types
export type {
  Role,
  TextContent,
  ImageContent,
  FileContent,
  MessageContent,
  Message,
  Tool,
  ToolChoicePrimitive,
  ToolChoiceByName,
  ToolChoiceExplicit,
  ToolChoice,
  ToolCall,
  JsonSchema,
  OutputSchema,
  ResponseFormat,
  InvokeParams,
  InvokeResult,
  ProviderConfig,
  LLMProvider,
} from "./types";

// Registry
export {
  LLMProviderRegistry,
  getRegistry,
  resetRegistry,
} from "./registry";

// Provider base classes
export {
  OpenAICompatibleProvider,
  type OpenAICompatibleConfig,
} from "./providers/base";
