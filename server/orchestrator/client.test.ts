import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrchestratorClient } from "./client";
import {
  OrchestratorUnavailableError,
  OrchestratorServiceError,
} from "./types";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("OrchestratorClient", () => {
  let client: OrchestratorClient;

  beforeEach(() => {
    client = new OrchestratorClient("http://localhost:8001");
    vi.clearAllMocks();
  });

  describe("startWorkflow", () => {
    it("should start a workflow successfully", async () => {
      const mockResponse = {
        workflow_id: "test-workflow-123",
        status: "started",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.startWorkflow({
        task: "Create a todo app",
        framework: "react",
      });

      expect(result.workflow_id).toBe("test-workflow-123");
      expect(result.status).toBe("started");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/workflow/start",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should throw OrchestratorUnavailableError on network error", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));

      await expect(
        client.startWorkflow({ task: "test", framework: "react" })
      ).rejects.toThrow(OrchestratorUnavailableError);
    });

    it("should throw OrchestratorServiceError on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ detail: "Server error" }),
      });

      await expect(
        client.startWorkflow({ task: "test", framework: "react" })
      ).rejects.toThrow(OrchestratorServiceError);
    });
  });

  describe("getWorkflowStatus", () => {
    it("should get workflow status successfully", async () => {
      const mockStatus = {
        workflow_id: "test-workflow-123",
        status: "running",
        current_agent: "planner",
        iteration: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await client.getWorkflowStatus("test-workflow-123");

      expect(result.status).toBe("running");
      expect(result.current_agent).toBe("planner");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/workflow/test-workflow-123/status",
        expect.any(Object)
      );
    });
  });

  describe("getWorkflowResult", () => {
    it("should get workflow result successfully", async () => {
      const mockResult = {
        workflow_id: "test-workflow-123",
        status: "completed",
        files: { "/App.tsx": "export default function App() {}" },
        plan: ["Create component", "Add styling"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await client.getWorkflowResult("test-workflow-123");

      expect(result.status).toBe("completed");
      expect(result.files).toHaveProperty("/App.tsx");
      expect(result.plan).toHaveLength(2);
    });
  });

  describe("isHealthy", () => {
    it("should return true when service is healthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok" }),
      });

      const healthy = await client.isHealthy();
      expect(healthy).toBe(true);
    });

    it("should return false when service is unhealthy", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const healthy = await client.isHealthy();
      expect(healthy).toBe(false);
    });

    it("should return false on non-ok status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "error" }),
      });

      const healthy = await client.isHealthy();
      expect(healthy).toBe(false);
    });
  });

  describe("listWorkflows", () => {
    it("should list workflows successfully", async () => {
      const mockList = {
        workflows: [
          {
            workflow_id: "wf-1",
            status: "completed",
            current_agent: "none",
            task: "Task 1",
          },
          {
            workflow_id: "wf-2",
            status: "running",
            current_agent: "coder",
            task: "Task 2",
          },
        ],
        count: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockList,
      });

      const result = await client.listWorkflows();

      expect(result.count).toBe(2);
      expect(result.workflows).toHaveLength(2);
    });
  });
});
