CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`establishmentNumber` text NOT NULL,
	`companyName` text,
	`postalCode` text,
	`address` text,
	`employeeCount` integer,
	`foundedYear` text,
	`capital` text,
	`businessDescription` text,
	`corporateNumber` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
CREATE UNIQUE INDEX `companies_establishmentNumber_unique` ON `companies` (`establishmentNumber`);
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
	`establishmentNumber` text,
	`jobCategory` text,
	`industryClassification` text,
	`publicEmploymentOffice` text,
	`onlineApplicationAccepted` integer,
	`dispatchType` text,
	`employmentPeriod` text,
	`ageRequirement` text,
	`education` text,
	`requiredExperience` text,
	`trialPeriod` text,
	`carCommute` text,
	`transferPossibility` text,
	`wageType` text,
	`raise` text,
	`bonus` text,
	`insurance` text,
	`retirementBenefit` text,
	`status` text DEFAULT 'active' NOT NULL CHECK(`status` IN ('active', 'expired')),
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
CREATE UNIQUE INDEX `jobs_jobNumber_unique` ON `jobs` (`jobNumber`);
CREATE TABLE `job_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jobNumber` text NOT NULL,
	`r2Key` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`jobNumber`) REFERENCES `jobs`(`jobNumber`)
);
CREATE UNIQUE INDEX `job_attachments_jobNumber_unique` ON `job_attachments` (`jobNumber`);
