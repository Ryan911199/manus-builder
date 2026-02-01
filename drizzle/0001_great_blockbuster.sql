CREATE TABLE `deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`versionId` int,
	`status` enum('pending','building','deploying','success','failed') NOT NULL DEFAULT 'pending',
	`coolifyAppUuid` varchar(64),
	`deployedUrl` text,
	`errorMessage` text,
	`envVars` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`files` json NOT NULL,
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`framework` varchar(64) NOT NULL DEFAULT 'react',
	`files` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`coolifyApiUrl` text,
	`coolifyApiToken` text,
	`coolifyProjectUuid` varchar(64),
	`coolifyServerUuid` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
