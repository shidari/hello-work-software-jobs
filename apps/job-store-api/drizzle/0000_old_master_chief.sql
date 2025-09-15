CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jobNumber` text NOT NULL,
	`companyName` text NOT NULL,
	`receivedDate` text NOT NULL,
	`expiryDate` text NOT NULL,
	`homePage` text,
	`occupation` text NOT NULL,
	`employmentType` text NOT NULL,
	`wageMin` integer NOT NULL,
	`wageMax` integer NOT NULL,
	`workingStartTime` text,
	`workingEndTime` text,
	`employeeCount` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_jobNumber_unique` ON `jobs` (`jobNumber`);