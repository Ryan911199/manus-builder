/**
 * LLM Provider Implementations
 *
 * This module exports all concrete provider implementations.
 */

// Base class
export { OpenAICompatibleProvider, type OpenAICompatibleConfig } from "./base";

// OpenAI
import { OpenAIProvider, createOpenAIProvider } from "./openai";
export { OpenAIProvider, createOpenAIProvider };

// Anthropic
import {
  AnthropicProvider,
  createAnthropicProvider,
  type AnthropicConfig,
} from "./anthropic";
export { AnthropicProvider, createAnthropicProvider, type AnthropicConfig };

// MiniMax
import {
  MiniMaxProvider,
  createMiniMaxProvider,
  type MiniMaxConfig,
} from "./minimax";
export { MiniMaxProvider, createMiniMaxProvider, type MiniMaxConfig };

// Ollama
import { OllamaProvider, createOllamaProvider } from "./ollama";
export { OllamaProvider, createOllamaProvider };

// Provider factory map
export const providerFactories = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  minimax: createMiniMaxProvider,
  ollama: createOllamaProvider,
} as const;

export type ProviderName = keyof typeof providerFactories;
