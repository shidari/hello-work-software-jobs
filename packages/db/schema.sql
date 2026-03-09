CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jobNumber` text NOT NULL,
	`companyName` text,
	`receivedDate` text NOT NULL,
	`expiryDate` text NOT NULL,
	`homePage` text,
	`occupation` text NOT NULL,
	`employmentType` text NOT NULL,
	`wageMin` integer,
	`wageMax` integer,
	`workingStartTime` text,
	`workingEndTime` text,
	`employeeCount` integer,
	`workPlace` text,
	`jobDescription` text,
	`qualifications` text,
	`status` text DEFAULT 'active' NOT NULL CHECK(`status` IN ('active', 'expired')),
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
CREATE UNIQUE INDEX `jobs_jobNumber_unique` ON `jobs` (`jobNumber`);
CREATE TABLE `crawler_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text NOT NULL CHECK(`status` IN ('success', 'failed')),
	`trigger` text NOT NULL CHECK(`trigger` IN ('cron', 'manual')),
	`startedAt` text NOT NULL,
	`finishedAt` text,
	`fetchedCount` integer DEFAULT 0 NOT NULL,
	`queuedCount` integer DEFAULT 0 NOT NULL,
	`failedCount` integer DEFAULT 0 NOT NULL,
	`errorMessage` text,
	`createdAt` text NOT NULL
);
CREATE TABLE `job_detail_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jobNumber` text NOT NULL,
	`status` text NOT NULL CHECK(`status` IN ('success', 'failed')),
	`stage` text,
	`startedAt` text NOT NULL,
	`finishedAt` text,
	`errorMessage` text,
	`createdAt` text NOT NULL
);
