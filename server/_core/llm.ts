import { ENV } from "./env";
import {
  getRegistry,
  OpenAICompatibleProvider,
  type OpenAICompatibleConfig,
} from "../llm";
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

class DefaultProvider extends OpenAICompatibleProvider {
  readonly name = "default";

  protected getDefaultBaseUrl(): string {
    return "https://api.openai.com";
  }

  protected getDefaultModel(): string {
    return "gemini-2.5-flash";
  }

  protected buildPayload(params: InvokeParams): Record<string, unknown> {
    const payload = super.buildPayload(params);
    
    payload.max_tokens = (params.maxTokens || params.max_tokens) ?? 32768;
    payload.thinking = {
      budget_tokens: 128,
    };

    return payload;
  }
}

function initializeRegistry(): void {
  const registry = getRegistry();
  
  if (registry.has("default")) {
    return;
  }

  const config: OpenAICompatibleConfig = {
    apiKey: ENV.llmApiKey || ENV.forgeApiKey,
    baseUrl: ENV.llmApiUrl || ENV.forgeApiUrl || undefined,
    model: ENV.llmModel || undefined,
  };

  const defaultProvider = new DefaultProvider(config);
  registry.register(defaultProvider, true);
}

function assertApiKey(): void {
  const apiKey = ENV.llmApiKey || ENV.forgeApiKey;
  if (!apiKey) {
    if (!ENV.isDev) {
      throw new Error("LLM_API_KEY is not configured");
    }
    console.warn("[LLM] API key not configured - LLM calls will fail in production");
  }
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();
  initializeRegistry();
  
  const registry = getRegistry();
  const provider = registry.getDefault();
  
  return provider.invoke(params);
}

export { getRegistry, initializeRegistry };
