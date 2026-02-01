/**
 * LLM Provider Registry
 * 
 * Manages registered LLM providers and provides access to them.
 * Simple Map-based implementation - no complex DI needed.
 */

import type { LLMProvider } from "./types";

/**
 * Registry for managing multiple LLM providers.
 * Supports registering, retrieving, and selecting a default provider.
 */
export class LLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProviderName: string | null = null;

  /**
   * Register a provider with the registry.
   * @param provider - The provider to register
   * @param setAsDefault - If true, sets this as the default provider
   */
  register(provider: LLMProvider, setAsDefault = false): void {
    if (this.providers.has(provider.name)) {
      console.warn(`[LLM Registry] Provider "${provider.name}" already registered, overwriting`);
    }
    
    this.providers.set(provider.name, provider);
    
    if (setAsDefault || this.defaultProviderName === null) {
      this.defaultProviderName = provider.name;
    }
  }

  /**
   * Get a provider by name.
   * @param name - The name of the provider to retrieve
   * @returns The provider, or undefined if not found
   */
  get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get the default provider.
   * @throws Error if no providers are registered
   */
  getDefault(): LLMProvider {
    if (this.defaultProviderName === null) {
      throw new Error("[LLM Registry] No providers registered");
    }
    
    const provider = this.providers.get(this.defaultProviderName);
    if (!provider) {
      throw new Error(`[LLM Registry] Default provider "${this.defaultProviderName}" not found`);
    }
    
    return provider;
  }

  /**
   * Set the default provider by name.
   * @param name - The name of the provider to set as default
   * @throws Error if the provider is not registered
   */
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`[LLM Registry] Cannot set default: provider "${name}" not registered`);
    }
    this.defaultProviderName = name;
  }

  /**
   * Check if a provider is registered.
   * @param name - The name of the provider to check
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * List all registered provider names.
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get the name of the default provider, or null if none set.
   */
  getDefaultName(): string | null {
    return this.defaultProviderName;
  }

  /**
   * Remove a provider from the registry.
   * @param name - The name of the provider to remove
   */
  unregister(name: string): boolean {
    const deleted = this.providers.delete(name);
    
    if (deleted && this.defaultProviderName === name) {
      // If we deleted the default, pick the first remaining or null
      const remaining = this.providers.keys().next();
      this.defaultProviderName = remaining.done ? null : remaining.value;
    }
    
    return deleted;
  }

  /**
   * Clear all registered providers.
   */
  clear(): void {
    this.providers.clear();
    this.defaultProviderName = null;
  }
}

// Global singleton instance
let globalRegistry: LLMProviderRegistry | null = null;

/**
 * Get the global LLM provider registry instance.
 * Creates the instance on first call (lazy initialization).
 */
export function getRegistry(): LLMProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new LLMProviderRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (mainly for testing).
 */
export function resetRegistry(): void {
  globalRegistry = null;
}
