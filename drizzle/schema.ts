import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table - stores user's generated web applications
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  framework: varchar("framework", { length: 64 }).notNull().default("react"),
  files: json("files").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project versions - tracks history of project changes
 */
export const projectVersions = mysqlTable("project_versions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  files: json("files").$type<Record<string, string>>().notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

/**
 * Deployments - tracks deployment history to Coolify
 */
export const deployments = mysqlTable("deployments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  versionId: int("versionId"),
  status: mysqlEnum("status", ["pending", "building", "deploying", "success", "failed"]).notNull().default("pending"),
  coolifyAppUuid: varchar("coolifyAppUuid", { length: 64 }),
  deployedUrl: text("deployedUrl"),
  errorMessage: text("errorMessage"),
  envVars: json("envVars").$type<Record<string, string>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = typeof deployments.$inferInsert;

/**
 * User settings - stores Coolify API configuration
 */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  coolifyApiUrl: text("coolifyApiUrl"),
  coolifyApiToken: text("coolifyApiToken"),
  coolifyProjectUuid: varchar("coolifyProjectUuid", { length: 64 }),
  coolifyServerUuid: varchar("coolifyServerUuid", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
