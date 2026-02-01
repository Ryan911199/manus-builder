import { ENV } from "./env";
import { getRegistry } from "../llm";
import {
  createOpenAIProvider,
  createAnthropicProvider,
  createMiniMaxProvider,
  createOllamaProvider,
  type ProviderName,
} from "../llm/providers";
import type { InvokeParams, InvokeResult } from "../llm";

// Re-export types for backward compatibility
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
} from "../llm";

// Supported provider names
const SUPPORTED_PROVIDERS: ProviderName[] = ["openai", "anthropic", "minimax", "ollama"];

/**
 * Initialize the LLM provider registry with all supported providers.
 * Sets the default provider based on ENV.llmProvider.
 */
function initializeRegistry(): void {
  const registry = getRegistry();
  
  // Only initialize once
  if (registry.has("openai")) {
    return;
  }

  // Register all providers
  registry.register(createOpenAIProvider());
  registry.register(createAnthropicProvider());
  registry.register(createMiniMaxProvider());
  registry.register(createOllamaProvider());

  // Set default based on ENV.llmProvider
  const preferredProvider = (ENV.llmProvider || "openai") as ProviderName;
  
  if (SUPPORTED_PROVIDERS.includes(preferredProvider) && registry.has(preferredProvider)) {
    registry.setDefault(preferredProvider);
  } else {
    // Fallback to openai if invalid provider specified
    console.warn(`[LLM] Unknown provider "${ENV.llmProvider}", falling back to openai`);
    registry.setDefault("openai");
  }
}

/**
 * Assert that the current provider has an API key configured.
 */
function assertApiKey(): void {
  const registry = getRegistry();
  const provider = registry.getDefault();
  
  if (!provider.isConfigured()) {
    if (!ENV.isDev) {
      throw new Error(`[LLM] Provider "${provider.name}" is not configured - missing API key`);
    }
    console.warn(`[LLM] Provider "${provider.name}" not configured - LLM calls may fail`);
  }
}

/**
 * Invoke the default LLM provider with the given parameters.
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  initializeRegistry();
  assertApiKey();
  
  const registry = getRegistry();
  const provider = registry.getDefault();
  
  return provider.invoke(params);
}

/**
 * Get all available provider names.
 */
export function getAvailableProviders(): string[] {
  initializeRegistry();
  return getRegistry().listProviders();
}

/**
 * Get the current default provider name.
 */
export function getCurrentProvider(): string {
  initializeRegistry();
  return getRegistry().getDefaultName() || "openai";
}

export { getRegistry, initializeRegistry };
