import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  invokeLLM,
  getAvailableProviders,
  getCurrentProvider,
} from "./_core/llm";
import { ENV } from "./_core/env";
import {
  OrchestratorClient,
  OrchestratorUnavailableError,
} from "./orchestrator/client";

// Coolify API helper
async function callCoolifyApi(
  baseUrl: string,
  token: string,
  endpoint: string,
  method: string = "GET",
  body?: unknown
) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Coolify API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Generate Dockerfile based on framework
function generateDockerfile(
  framework: string,
  files: Record<string, string>
): string {
  const hasPackageJson = "/package.json" in files;

  if (framework === "react" || framework === "vue" || framework === "vite") {
    return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
  }

  if (framework === "nextjs") {
    return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]`;
  }

  // Static HTML fallback
  return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
}

export const appRouter = router({
  system: systemRouter,

  // LLM provider management
  llm: router({
    providers: publicProcedure.query(() => {
      return getAvailableProviders();
    }),

    current: publicProcedure.query(() => {
      return getCurrentProvider();
    }),

    testKey: publicProcedure
      .input(
        z.object({
          provider: z.string(),
          apiKey: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { provider, apiKey } = input;

        if (!apiKey || apiKey.trim() === "") {
          return {
            success: false,
            message: "API key is required",
          };
        }

        try {
          let testProvider;
          let testModel;

          switch (provider) {
            case "openai": {
              const { OpenAIProvider } = await import("./llm/providers/openai");
              testProvider = new OpenAIProvider({ apiKey });
              testModel = "gpt-3.5-turbo";
              break;
            }
            case "anthropic": {
              const { AnthropicProvider } = await import(
                "./llm/providers/anthropic"
              );
              testProvider = new AnthropicProvider({ apiKey });
              testModel = "claude-3-haiku-20240307";
              break;
            }
            case "minimax": {
              const { MiniMaxProvider } = await import(
                "./llm/providers/minimax"
              );
              testProvider = new MiniMaxProvider({ apiKey });
              testModel = "abab6.5s-chat";
              break;
            }
            case "ollama":
              return {
                success: true,
                message: "Ollama does not require API key validation",
              };
            default:
              return {
                success: false,
                message: `Unknown provider: ${provider}`,
              };
          }

          await testProvider.invoke({
            model: testModel,
            messages: [
              {
                role: "user",
                content: "test",
              },
            ],
            maxTokens: 5,
          });

          return {
            success: true,
            message: "API key is valid",
          };
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "API key validation failed",
          };
        }
      }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Project management
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getProjectsByUser(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getProjectById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          framework: z.string().default("react"),
          files: z.record(z.string(), z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const project = await db.createProject({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          framework: input.framework,
          files: input.files,
        });

        // Create initial version
        await db.createProjectVersion({
          projectId: project.id,
          versionNumber: 1,
          files: input.files,
          message: "Initial version",
        });

        return project;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          files: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const project = await db.updateProject(id, ctx.user.id, data);

        // Create new version if files changed
        if (data.files && project) {
          const latestVersion = await db.getLatestVersionNumber(id);
          await db.createProjectVersion({
            projectId: id,
            versionNumber: latestVersion + 1,
            files: data.files,
            message: "Updated files",
          });
        }

        return project;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteProject(input.id, ctx.user.id);
      }),

    versions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectVersions(input.projectId);
      }),
  }),

  // AI code generation
  ai: router({
    generate: protectedProcedure
      .input(
        z.object({
          prompt: z.string(),
          framework: z.string().default("react"),
          existingFiles: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const systemPrompt = `You are an expert web developer. Generate clean, working code based on the user's request.

Framework: ${input.framework}
${input.existingFiles ? `\nExisting files:\n${JSON.stringify(input.existingFiles, null, 2)}` : ""}

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "files": {
    "/path/to/file.ext": "file content here",
    ...
  },
  "explanation": "Brief explanation of what was created/modified"
}

For React projects, always include:
- /App.jsx or /App.tsx
- /index.html (if needed)
- /styles.css (if needed)

For Vue projects, always include:
- /App.vue
- /main.js

Generate complete, working code that can run in a browser sandbox.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "code_generation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "object",
                    additionalProperties: { type: "string" },
                    description: "Map of file paths to file contents",
                  },
                  explanation: {
                    type: "string",
                    description: "Brief explanation of the generated code",
                  },
                },
                required: ["files", "explanation"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new Error("No response from AI");
        }

        try {
          return JSON.parse(content) as {
            files: Record<string, string>;
            explanation: string;
          };
        } catch (parseError) {
          console.error("[AI] Failed to parse LLM response:", content);
          throw new Error(
            `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
          );
        }
      }),

    orchestrate: protectedProcedure
      .input(
        z.object({
          task: z.string().min(1),
          framework: z.string().default("react"),
        })
      )
      .mutation(async ({ input }) => {
        const client = new OrchestratorClient(ENV.orchestratorUrl);

        try {
          const result = await client.startWorkflow({
            task: input.task,
            framework: input.framework,
          });
          return {
            workflowId: result.workflow_id,
            status: result.status,
            usedOrchestrator: true,
          };
        } catch (error) {
          if (error instanceof OrchestratorUnavailableError) {
            console.warn(
              "[AI] Orchestrator unavailable, falling back to direct LLM"
            );

            const systemPrompt = `You are an expert web developer. Generate clean, working code based on the user's request.

Framework: ${input.framework}

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "files": {
    "/path/to/file.ext": "file content here",
    ...
  },
  "explanation": "Brief explanation of what was created/modified"
}

For React projects, always include:
- /App.jsx or /App.tsx
- /index.html (if needed)
- /styles.css (if needed)

For Vue projects, always include:
- /App.vue
- /main.js

Generate complete, working code that can run in a browser sandbox.`;

            const response = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: input.task },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "code_generation",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      files: {
                        type: "object",
                        additionalProperties: { type: "string" },
                        description: "Map of file paths to file contents",
                      },
                      explanation: {
                        type: "string",
                        description: "Brief explanation of the generated code",
                      },
                    },
                    required: ["files", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
            });

            const content = response.choices[0]?.message?.content;
            if (!content || typeof content !== "string") {
              throw new Error("No response from AI");
            }

            try {
              const parsed = JSON.parse(content) as {
                files: Record<string, string>;
                explanation: string;
              };
              return {
                workflowId: null,
                status: "completed",
                usedOrchestrator: false,
                files: parsed.files,
                explanation: parsed.explanation,
              };
            } catch (parseError) {
              console.error("[AI] Failed to parse LLM response:", content);
              throw new Error(
                `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
              );
            }
          }
          throw error;
        }
      }),

    workflowStatus: protectedProcedure
      .input(
        z.object({
          workflowId: z.string().min(1),
        })
      )
      .query(async ({ input }) => {
        const client = new OrchestratorClient(ENV.orchestratorUrl);

        try {
          const status = await client.getWorkflowStatus(input.workflowId);

          if (status.status === "completed" || status.status === "failed") {
            try {
              const result = await client.getWorkflowResult(input.workflowId);
              return {
                workflowId: input.workflowId,
                status: result.status,
                currentAgent: status.current_agent,
                iteration: status.iteration,
                files: result.files,
                plan: result.plan,
                explanation: result.explanation,
                error: status.error,
              };
            } catch {
              return {
                workflowId: input.workflowId,
                status: status.status,
                currentAgent: status.current_agent,
                iteration: status.iteration,
                error: status.error,
              };
            }
          }

          return {
            workflowId: input.workflowId,
            status: status.status,
            currentAgent: status.current_agent,
            iteration: status.iteration,
            error: status.error,
          };
        } catch (error) {
          if (error instanceof OrchestratorUnavailableError) {
            return {
              workflowId: input.workflowId,
              status: "failed" as const,
              error: "Orchestrator service is unavailable",
            };
          }
          throw error;
        }
      }),
  }),

  // Coolify deployment
  deploy: router({
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserSettings(ctx.user.id);
      return settings
        ? {
            coolifyApiUrl: settings.coolifyApiUrl,
            coolifyProjectUuid: settings.coolifyProjectUuid,
            coolifyServerUuid: settings.coolifyServerUuid,
            hasToken: !!settings.coolifyApiToken,
          }
        : null;
    }),

    saveSettings: protectedProcedure
      .input(
        z.object({
          coolifyApiUrl: z.string().url(),
          coolifyApiToken: z.string().min(1),
          coolifyProjectUuid: z.string().min(1),
          coolifyServerUuid: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserSettings(ctx.user.id, input);
      }),

    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      const settings = await db.getUserSettings(ctx.user.id);
      if (!settings?.coolifyApiUrl || !settings?.coolifyApiToken) {
        throw new Error("Coolify settings not configured");
      }

      try {
        await callCoolifyApi(
          settings.coolifyApiUrl,
          settings.coolifyApiToken,
          "/api/v1/servers"
        );
        return { success: true, message: "Connection successful" };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Connection failed",
        };
      }
    }),

    deployProject: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          envVars: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getUserSettings(ctx.user.id);
        if (
          !settings?.coolifyApiUrl ||
          !settings?.coolifyApiToken ||
          !settings?.coolifyProjectUuid ||
          !settings?.coolifyServerUuid
        ) {
          throw new Error("Coolify settings not configured");
        }

        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new Error("Project not found");
        }

        // Create deployment record
        const deployment = await db.createDeployment({
          projectId: project.id,
          status: "pending",
          envVars: input.envVars ?? null,
        });

        try {
          // Generate Dockerfile
          const dockerfile = generateDockerfile(
            project.framework,
            project.files
          );

          // Create application in Coolify
          const appResponse = await callCoolifyApi(
            settings.coolifyApiUrl,
            settings.coolifyApiToken,
            "/api/v1/applications/dockerfile",
            "POST",
            {
              project_uuid: settings.coolifyProjectUuid,
              server_uuid: settings.coolifyServerUuid,
              environment_name: "production",
              dockerfile: dockerfile,
              name: project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              instant_deploy: true,
              ports_exposes: "80",
            }
          );

          await db.updateDeployment(deployment.id, {
            status: "building",
            coolifyAppUuid: appResponse.uuid,
          });

          // Deploy the application
          await callCoolifyApi(
            settings.coolifyApiUrl,
            settings.coolifyApiToken,
            `/api/v1/applications/${appResponse.uuid}/deploy`,
            "POST"
          );

          await db.updateDeployment(deployment.id, {
            status: "deploying",
          });

          return {
            success: true,
            deploymentId: deployment.id,
            appUuid: appResponse.uuid,
          };
        } catch (error) {
          await db.updateDeployment(deployment.id, {
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Deployment failed",
          });
          throw error;
        }
      }),

    getDeployments: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getDeploymentsByProject(input.projectId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
