CREATE TABLE `activity_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`professional_id` int NOT NULL,
	`activity_type_id` int,
	`date` date NOT NULL,
	`start_time` varchar(8) NOT NULL,
	`end_time` varchar(8) NOT NULL,
	`description` text,
	`color` varchar(32),
	`duration_total_min` int NOT NULL DEFAULT 0,
	`duration_normal_min` int NOT NULL DEFAULT 0,
	`duration_overtime_min` int NOT NULL DEFAULT 0,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activity_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`color` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_types_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`column_order` int NOT NULL DEFAULT 0,
	`color` varchar(32) DEFAULT '#6366f1',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `professionals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_date` ON `activity_blocks` (`date`);--> statement-breakpoint
CREATE INDEX `idx_professional_date` ON `activity_blocks` (`professional_id`,`date`);