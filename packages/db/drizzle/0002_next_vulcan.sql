PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_jobs` (
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
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_jobs`("id", "jobNumber", "companyName", "receivedDate", "expiryDate", "homePage", "occupation", "employmentType", "wageMin", "wageMax", "workingStartTime", "workingEndTime", "employeeCount", "workPlace", "jobDescription", "qualifications", "status", "createdAt", "updatedAt") SELECT "id", "jobNumber", "companyName", "receivedDate", "expiryDate", "homePage", "occupation", "employmentType", "wageMin", "wageMax", "workingStartTime", "workingEndTime", "employeeCount", "workPlace", "jobDescription", "qualifications", "status", "createdAt", "updatedAt" FROM `jobs`;--> statement-breakpoint
DROP TABLE `jobs`;--> statement-breakpoint
ALTER TABLE `__new_jobs` RENAME TO `jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_jobNumber_unique` ON `jobs` (`jobNumber`);