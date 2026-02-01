/**
 * HTTP client for the Python orchestrator service.
 *
 * Provides a clean interface for Node.js backend to communicate
 * with the LangGraph-based agent orchestration service.
 */

import {
  type WorkflowRequest,
  type WorkflowStartResponse,
  type WorkflowStatusResponse,
  type WorkflowResultResponse,
  type HealthResponse,
  type ListWorkflowsResponse,
  OrchestratorServiceError,
  OrchestratorUnavailableError,
} from "./types";

// Default timeout for HTTP requests (30 seconds)
const DEFAULT_TIMEOUT = 30000;

/**
 * HTTP client for communicating with the Python orchestrator service.
 */
export class OrchestratorClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  /**
   * Create a new OrchestratorClient.
   *
   * @param baseUrl - Base URL of the orchestrator service (e.g., "http://localhost:8001")
   * @param timeout - Request timeout in milliseconds (default: 30000)
   */
  constructor(baseUrl: string, timeout: number = DEFAULT_TIMEOUT) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeout = timeout;
  }

  /**
   * Make an HTTP request to the orchestrator service.
   *
   * @param endpoint - API endpoint (e.g., "/workflow/start")
   * @param options - Fetch options
   * @returns Parsed JSON response
   * @throws OrchestratorUnavailableError if service is unreachable
   * @throws OrchestratorServiceError if service returns an error
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to parse error detail from response
        let detail: string | undefined;
        try {
          const errorBody = await response.json();
          detail = errorBody.detail;
        } catch {
          // Ignore JSON parse errors for error response
        }

        throw new OrchestratorServiceError(
          `Orchestrator request failed: ${response.status} ${response.statusText}`,
          response.status,
          detail
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw our custom errors
      if (
        error instanceof OrchestratorServiceError ||
        error instanceof OrchestratorUnavailableError
      ) {
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new OrchestratorUnavailableError(
          `Orchestrator request timed out after ${this.timeout}ms`
        );
      }

      // Handle network errors (service down)
      if (
        error instanceof TypeError ||
        (error instanceof Error && error.message.includes("fetch"))
      ) {
        throw new OrchestratorUnavailableError(
          `Failed to connect to orchestrator at ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Re-throw unknown errors
      throw error;
    }
  }

  /**
   * Check if the orchestrator service is healthy.
   *
   * @returns True if service is healthy, false otherwise
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.request<HealthResponse>("/health");
      return response.status === "ok";
    } catch {
      return false;
    }
  }

  /**
   * Start a new workflow for code generation.
   *
   * @param params - Workflow parameters
   * @returns Workflow ID and initial status
   * @throws OrchestratorUnavailableError if service is unreachable
   */
  async startWorkflow(params: WorkflowRequest): Promise<WorkflowStartResponse> {
    return this.request<WorkflowStartResponse>("/workflow/start", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Get the status of a workflow.
   *
   * @param workflowId - ID of the workflow to check
   * @returns Current workflow status
   * @throws OrchestratorServiceError if workflow not found (404)
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResponse> {
    return this.request<WorkflowStatusResponse>(
      `/workflow/${encodeURIComponent(workflowId)}/status`
    );
  }

  /**
   * Get the result of a completed workflow.
   *
   * @param workflowId - ID of the workflow
   * @returns Generated files and plan
   * @throws OrchestratorServiceError if workflow not found (404) or still in progress (202)
   */
  async getWorkflowResult(workflowId: string): Promise<WorkflowResultResponse> {
    return this.request<WorkflowResultResponse>(
      `/workflow/${encodeURIComponent(workflowId)}/result`
    );
  }

  /**
   * List all workflows.
   *
   * @returns List of workflow summaries
   */
  async listWorkflows(): Promise<ListWorkflowsResponse> {
    return this.request<ListWorkflowsResponse>("/workflows");
  }

  /**
   * Poll for workflow completion with configurable interval and timeout.
   *
   * @param workflowId - ID of the workflow to poll
   * @param pollInterval - Interval between polls in milliseconds (default: 1000)
   * @param maxWait - Maximum time to wait in milliseconds (default: 300000 = 5 minutes)
   * @returns Final workflow result
   * @throws Error if timeout reached or workflow fails
   */
  async waitForCompletion(
    workflowId: string,
    pollInterval: number = 1000,
    maxWait: number = 300000
  ): Promise<WorkflowResultResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const status = await this.getWorkflowStatus(workflowId);

      // Check for terminal states
      if (status.status === "completed") {
        return this.getWorkflowResult(workflowId);
      }

      if (status.status === "failed") {
        throw new OrchestratorServiceError(
          `Workflow ${workflowId} failed: ${status.error || "Unknown error"}`,
          500,
          status.error || undefined
        );
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new OrchestratorServiceError(
      `Workflow ${workflowId} timed out after ${maxWait}ms`,
      408, // Request Timeout
      `Workflow did not complete within ${maxWait / 1000} seconds`
    );
  }
}

/**
 * Create an OrchestratorClient instance.
 *
 * @param baseUrl - Base URL of the orchestrator service
 * @param timeout - Request timeout in milliseconds
 * @returns OrchestratorClient instance
 */
export function createOrchestratorClient(
  baseUrl: string,
  timeout?: number
): OrchestratorClient {
  return new OrchestratorClient(baseUrl, timeout);
}

/**
 * Re-export types for convenience.
 */
export {
  type WorkflowRequest,
  type WorkflowStartResponse,
  type WorkflowStatusResponse,
  type WorkflowResultResponse,
  type HealthResponse,
  type ListWorkflowsResponse,
  OrchestratorServiceError,
  OrchestratorUnavailableError,
} from "./types";
