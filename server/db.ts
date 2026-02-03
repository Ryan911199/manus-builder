import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  projects,
  InsertProject,
  Project,
  projectVersions,
  InsertProjectVersion,
  ProjectVersion,
  deployments,
  InsertDeployment,
  Deployment,
  userSettings,
  InsertUserSettings,
  UserSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER QUERIES ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL upsert using ON CONFLICT
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== PROJECT QUERIES ====================

export async function createProject(data: InsertProject): Promise<Project> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // PostgreSQL uses RETURNING to get the inserted row
  const [project] = await db.insert(projects).values(data).returning();
  return project;
}

export async function getProjectById(
  id: number,
  userId: number
): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  return project;
}

export async function getProjectsByUser(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function updateProject(
  id: number,
  userId: number,
  data: Partial<InsertProject>
): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Add updatedAt timestamp for PostgreSQL (no auto-update trigger)
  const updateData = { ...data, updatedAt: new Date() };

  await db
    .update(projects)
    .set(updateData)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));

  return getProjectById(id, userId);
}

export async function deleteProject(
  id: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning({ id: projects.id });

  return result.length > 0;
}

// ==================== PROJECT VERSION QUERIES ====================

export async function createProjectVersion(
  data: InsertProjectVersion
): Promise<ProjectVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [version] = await db.insert(projectVersions).values(data).returning();
  return version;
}

export async function getProjectVersions(
  projectId: number
): Promise<ProjectVersion[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.versionNumber));
}

export async function getLatestVersionNumber(
  projectId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [latest] = await db
    .select({ versionNumber: projectVersions.versionNumber })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.versionNumber))
    .limit(1);

  return latest?.versionNumber ?? 0;
}

// ==================== DEPLOYMENT QUERIES ====================

export async function createDeployment(
  data: InsertDeployment
): Promise<Deployment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [deployment] = await db.insert(deployments).values(data).returning();
  return deployment;
}

export async function updateDeployment(
  id: number,
  data: Partial<InsertDeployment>
): Promise<Deployment | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Add updatedAt timestamp for PostgreSQL
  const updateData = { ...data, updatedAt: new Date() };

  const [deployment] = await db
    .update(deployments)
    .set(updateData)
    .where(eq(deployments.id, id))
    .returning();

  return deployment;
}

export async function getDeploymentsByProject(
  projectId: number
): Promise<Deployment[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(deployments)
    .where(eq(deployments.projectId, projectId))
    .orderBy(desc(deployments.createdAt));
}

// ==================== USER SETTINGS QUERIES ====================

export async function getUserSettings(
  userId: number
): Promise<UserSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return settings;
}

export async function upsertUserSettings(
  userId: number,
  data: Partial<InsertUserSettings>
): Promise<UserSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserSettings(userId);

  if (existing) {
    // Add updatedAt timestamp for PostgreSQL
    const updateData = { ...data, updatedAt: new Date() };
    await db
      .update(userSettings)
      .set(updateData)
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ ...data, userId });
  }

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return settings;
}
