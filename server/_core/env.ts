export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV !== "production",

  // LLM Provider Configuration
  // Legacy keys (backward compatible)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // New provider-based configuration
  llmProvider: process.env.LLM_PROVIDER ?? "openai",
  llmModel: process.env.LLM_MODEL ?? "",
  llmApiKey:
    process.env.LLM_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? "",
  llmApiUrl:
    process.env.LLM_API_URL ?? process.env.BUILT_IN_FORGE_API_URL ?? "",

  // Orchestrator Service Configuration
  orchestratorUrl: process.env.ORCHESTRATOR_URL ?? "http://localhost:8001",
};
