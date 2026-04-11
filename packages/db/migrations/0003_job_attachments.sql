-- 未使用テーブル削除
DROP TABLE IF EXISTS `job_detail_runs`;
DROP TABLE IF EXISTS `crawler_runs`;

-- 求人票 PDF メタデータテーブル（バイナリ本体は R2 に保存）
CREATE TABLE `job_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jobNumber` text NOT NULL,
	`r2Key` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`jobNumber`) REFERENCES `jobs`(`jobNumber`)
);
CREATE UNIQUE INDEX `job_attachments_jobNumber_unique` ON `job_attachments` (`jobNumber`);
