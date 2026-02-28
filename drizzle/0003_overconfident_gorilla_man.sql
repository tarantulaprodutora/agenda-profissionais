CREATE TABLE `requesters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requesters_id` PRIMARY KEY(`id`),
	CONSTRAINT `requesters_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `activity_blocks` ADD `requester_id` int;--> statement-breakpoint
ALTER TABLE `activity_blocks` ADD `job_number` varchar(64);--> statement-breakpoint
ALTER TABLE `activity_blocks` ADD `job_name` varchar(256);