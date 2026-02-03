import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

/**
 * Role enum for PostgreSQL
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * Deployment status enum for PostgreSQL
 */
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "building",
  "deploying",
  "success",
  "failed",
]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - stores user's generated web applications
 */
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  framework: varchar("framework", { length: 64 }).notNull().default("react"),
  files: jsonb("files").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project versions - tracks history of project changes
 */
export const projectVersions = pgTable("project_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  versionNumber: integer("versionNumber").notNull(),
  files: jsonb("files").$type<Record<string, string>>().notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

/**
 * Deployments - tracks deployment history to Coolify
 */
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId").notNull(),
  versionId: integer("versionId"),
  status: deploymentStatusEnum("status").notNull().default("pending"),
  coolifyAppUuid: varchar("coolifyAppUuid", { length: 64 }),
  deployedUrl: text("deployedUrl"),
  errorMessage: text("errorMessage"),
  envVars: jsonb("envVars").$type<Record<string, string>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = typeof deployments.$inferInsert;

/**
 * User settings - stores Coolify API configuration
 */
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  coolifyApiUrl: text("coolifyApiUrl"),
  coolifyApiToken: text("coolifyApiToken"),
  coolifyProjectUuid: varchar("coolifyProjectUuid", { length: 64 }),
  coolifyServerUuid: varchar("coolifyServerUuid", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
