import { describe, it, expect, beforeEach } from "vitest";
import { LLMProviderRegistry } from "./registry";
import type { LLMProvider, InvokeResult } from "./types";

// Helper to create a mock InvokeResult
function createMockResult(): InvokeResult {
  return {
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "test response",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  };
}

// Helper to create a mock provider
function createMockProvider(name: string): LLMProvider {
  return {
    name,
    invoke: async () => createMockResult(),
    isConfigured: () => true,
  };
}

describe("LLMProviderRegistry", () => {
  let registry: LLMProviderRegistry;

  beforeEach(() => {
    registry = new LLMProviderRegistry();
  });

  it("should register a provider", () => {
    const mockProvider = createMockProvider("test-provider");

    registry.register(mockProvider);
    const retrieved = registry.get("test-provider");

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("test-provider");
  });

  it("should return undefined for unregistered provider", () => {
    const provider = registry.get("nonexistent");
    expect(provider).toBeUndefined();
  });

  it("should set and get default provider", () => {
    const mockProvider = createMockProvider("default-provider");

    registry.register(mockProvider, true);

    const defaultProvider = registry.getDefault();
    expect(defaultProvider.name).toBe("default-provider");
  });

  it("should allow setting default after registration", () => {
    const provider1 = createMockProvider("provider1");
    const provider2 = createMockProvider("provider2");

    registry.register(provider1);
    registry.register(provider2);
    registry.setDefault("provider2");

    const defaultProvider = registry.getDefault();
    expect(defaultProvider.name).toBe("provider2");
  });

  it("should list all registered providers", () => {
    const provider1 = createMockProvider("provider1");
    const provider2 = createMockProvider("provider2");

    registry.register(provider1);
    registry.register(provider2);

    const providers = registry.listProviders();
    expect(providers).toContain("provider1");
    expect(providers).toContain("provider2");
  });

  it("should check if provider exists", () => {
    const mockProvider = createMockProvider("exists");
    registry.register(mockProvider);

    expect(registry.has("exists")).toBe(true);
    expect(registry.has("not-exists")).toBe(false);
  });

  it("should throw when getting default with no providers", () => {
    expect(() => registry.getDefault()).toThrow("No providers registered");
  });

  it("should throw when setting default to unregistered provider", () => {
    expect(() => registry.setDefault("nonexistent")).toThrow("not registered");
  });
});
