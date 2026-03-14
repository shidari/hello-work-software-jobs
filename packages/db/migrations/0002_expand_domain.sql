-- ドメインモデル拡張マイグレーション
-- companies テーブル追加 + jobs テーブルに新カラム追加

-- 1. companies テーブル
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

-- 2. jobs テーブル拡張
ALTER TABLE jobs ADD COLUMN `establishmentNumber` text;
ALTER TABLE jobs ADD COLUMN `jobCategory` text;
ALTER TABLE jobs ADD COLUMN `industryClassification` text;
ALTER TABLE jobs ADD COLUMN `publicEmploymentOffice` text;
ALTER TABLE jobs ADD COLUMN `onlineApplicationAccepted` integer;
ALTER TABLE jobs ADD COLUMN `dispatchType` text;
ALTER TABLE jobs ADD COLUMN `employmentPeriod` text;
ALTER TABLE jobs ADD COLUMN `ageRequirement` text;
ALTER TABLE jobs ADD COLUMN `education` text;
ALTER TABLE jobs ADD COLUMN `requiredExperience` text;
ALTER TABLE jobs ADD COLUMN `trialPeriod` text;
ALTER TABLE jobs ADD COLUMN `carCommute` text;
ALTER TABLE jobs ADD COLUMN `transferPossibility` text;
ALTER TABLE jobs ADD COLUMN `wageType` text;
ALTER TABLE jobs ADD COLUMN `raise` text;
ALTER TABLE jobs ADD COLUMN `bonus` text;
ALTER TABLE jobs ADD COLUMN `insurance` text;
ALTER TABLE jobs ADD COLUMN `retirementBenefit` text;
