/**
 * TypeScript types for the Python orchestrator service API.
 *
 * These types mirror the Pydantic models in services/orchestrator/main.py
 */

// ============================================================================
// Workflow Request/Response Types
// ============================================================================

/**
 * Request to start a new workflow.
 */
export interface WorkflowRequest {
  task: string;
  framework?: string;
}

/**
 * Response from starting a workflow.
 */
export interface WorkflowStartResponse {
  workflow_id: string;
  status: "started";
}

/**
 * Workflow status values.
 */
export type WorkflowStatus =
  | "started"
  | "running"
  | "planning_complete"
  | "needs_revision"
  | "coding_revision"
  | "completed"
  | "failed"
  | "unknown";

/**
 * Response from workflow status endpoint.
 */
export interface WorkflowStatusResponse {
  workflow_id: string;
  status: WorkflowStatus;
  current_agent: string;
  iteration: number;
  error?: string | null;
}

/**
 * Response from workflow result endpoint.
 */
export interface WorkflowResultResponse {
  workflow_id: string;
  status: WorkflowStatus;
  files: Record<string, string>;
  plan: string[];
  explanation?: string | null;
}

// ============================================================================
// Agent Test Types
// ============================================================================

/**
 * Request for testing planner agent.
 */
export interface PlannerTestRequest {
  task: string;
  framework?: string;
}

/**
 * Response from planner test.
 */
export interface PlannerTestResponse {
  subtasks: string[];
  reasoning?: string | null;
  error?: string | null;
}

/**
 * Request for testing coder agent.
 */
export interface CoderTestRequest {
  subtask: string;
  framework?: string;
  context?: Record<string, unknown> | null;
}

/**
 * Response from coder test.
 */
export interface CoderTestResponse {
  files: Record<string, string>;
  explanation?: string | null;
  error?: string | null;
}

/**
 * Request for testing reviewer agent.
 */
export interface ReviewerTestRequest {
  files: Record<string, string>;
  framework?: string;
}

/**
 * Response from reviewer test.
 */
export interface ReviewerTestResponse {
  approved: boolean;
  feedback: string;
  score?: number | null;
  issues?: string[] | null;
  suggestions?: string[] | null;
}

// ============================================================================
// List Workflows Response
// ============================================================================

/**
 * Summary of a workflow for listing.
 */
export interface WorkflowSummary {
  workflow_id: string;
  status: WorkflowStatus;
  current_agent: string;
  task: string;
}

/**
 * Response from list workflows endpoint.
 */
export interface ListWorkflowsResponse {
  workflows: WorkflowSummary[];
  count: number;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health check response.
 */
export interface HealthResponse {
  status: "ok";
}

/**
 * Root endpoint response.
 */
export interface RootResponse {
  service: string;
  version: string;
  status: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error response from orchestrator service.
 */
export interface OrchestratorError {
  detail: string;
}

/**
 * Custom error class for orchestrator service errors.
 */
export class OrchestratorServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "OrchestratorServiceError";
  }
}

/**
 * Error class for when orchestrator is unavailable.
 */
export class OrchestratorUnavailableError extends Error {
  constructor(message: string = "Orchestrator service is unavailable") {
    super(message);
    this.name = "OrchestratorUnavailableError";
  }
}
