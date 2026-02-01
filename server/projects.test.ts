import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getProjectsByUser: vi.fn(),
  getProjectById: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getProjectVersions: vi.fn(),
  getLatestVersionNumber: vi.fn(),
  createProjectVersion: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("projects router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("projects.list", () => {
    it("returns projects for the authenticated user", async () => {
      const mockProjects = [
        {
          id: 1,
          userId: 1,
          name: "Test Project",
          description: "A test project",
          framework: "react",
          files: { "/App.jsx": "export default function App() {}" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getProjectsByUser).mockResolvedValue(mockProjects);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.list();

      expect(db.getProjectsByUser).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProjects);
    });
  });

  describe("projects.get", () => {
    it("returns a specific project by id", async () => {
      const mockProject = {
        id: 1,
        userId: 1,
        name: "Test Project",
        description: "A test project",
        framework: "react",
        files: { "/App.jsx": "export default function App() {}" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getProjectById).mockResolvedValue(mockProject);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.get({ id: 1 });

      expect(db.getProjectById).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(mockProject);
    });

    it("returns undefined for non-existent project", async () => {
      vi.mocked(db.getProjectById).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.get({ id: 999 });

      expect(result).toBeUndefined();
    });
  });

  describe("projects.create", () => {
    it("creates a new project with initial version", async () => {
      const mockProject = {
        id: 1,
        userId: 1,
        name: "New Project",
        description: null,
        framework: "react",
        files: { "/App.jsx": "export default function App() {}" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createProject).mockResolvedValue(mockProject);
      vi.mocked(db.createProjectVersion).mockResolvedValue({
        id: 1,
        projectId: 1,
        versionNumber: 1,
        files: mockProject.files,
        message: "Initial version",
        createdAt: new Date(),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.create({
        name: "New Project",
        framework: "react",
        files: { "/App.jsx": "export default function App() {}" },
      });

      expect(db.createProject).toHaveBeenCalledWith({
        userId: 1,
        name: "New Project",
        description: null,
        framework: "react",
        files: { "/App.jsx": "export default function App() {}" },
      });
      expect(db.createProjectVersion).toHaveBeenCalledWith({
        projectId: 1,
        versionNumber: 1,
        files: { "/App.jsx": "export default function App() {}" },
        message: "Initial version",
      });
      expect(result).toEqual(mockProject);
    });
  });

  describe("projects.update", () => {
    it("updates project and creates new version when files change", async () => {
      const mockProject = {
        id: 1,
        userId: 1,
        name: "Updated Project",
        description: null,
        framework: "react",
        files: { "/App.jsx": "export default function App() { return <h1>Updated</h1>; }" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.updateProject).mockResolvedValue(mockProject);
      vi.mocked(db.getLatestVersionNumber).mockResolvedValue(1);
      vi.mocked(db.createProjectVersion).mockResolvedValue({
        id: 2,
        projectId: 1,
        versionNumber: 2,
        files: mockProject.files,
        message: "Updated files",
        createdAt: new Date(),
      });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.update({
        id: 1,
        name: "Updated Project",
        files: { "/App.jsx": "export default function App() { return <h1>Updated</h1>; }" },
      });

      expect(db.updateProject).toHaveBeenCalled();
      expect(db.getLatestVersionNumber).toHaveBeenCalledWith(1);
      expect(db.createProjectVersion).toHaveBeenCalledWith({
        projectId: 1,
        versionNumber: 2,
        files: { "/App.jsx": "export default function App() { return <h1>Updated</h1>; }" },
        message: "Updated files",
      });
      expect(result).toEqual(mockProject);
    });
  });

  describe("projects.delete", () => {
    it("deletes a project", async () => {
      vi.mocked(db.deleteProject).mockResolvedValue(true);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.delete({ id: 1 });

      expect(db.deleteProject).toHaveBeenCalledWith(1, 1);
      expect(result).toBe(true);
    });

    it("returns false when project not found", async () => {
      vi.mocked(db.deleteProject).mockResolvedValue(false);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.delete({ id: 999 });

      expect(result).toBe(false);
    });
  });

  describe("projects.versions", () => {
    it("returns version history for a project", async () => {
      const mockVersions = [
        {
          id: 2,
          projectId: 1,
          versionNumber: 2,
          files: { "/App.jsx": "v2 content" },
          message: "Updated files",
          createdAt: new Date(),
        },
        {
          id: 1,
          projectId: 1,
          versionNumber: 1,
          files: { "/App.jsx": "v1 content" },
          message: "Initial version",
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.getProjectVersions).mockResolvedValue(mockVersions);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.projects.versions({ projectId: 1 });

      expect(db.getProjectVersions).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockVersions);
      expect(result[0].versionNumber).toBe(2); // Most recent first
    });
  });
});
