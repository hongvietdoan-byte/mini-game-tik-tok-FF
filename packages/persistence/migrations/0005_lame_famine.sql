CREATE TABLE `achievement_awards` (
	`round_id` text NOT NULL,
	`scope` text NOT NULL,
	`scope_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`player_id` text NOT NULL,
	`revision` integer NOT NULL,
	`metric_key` text NOT NULL,
	`metric_value` integer NOT NULL,
	`rank` integer NOT NULL,
	`tied` integer NOT NULL,
	`updated_at_ms` integer NOT NULL,
	PRIMARY KEY(`round_id`, `achievement_id`, `scope_id`, `player_id`),
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `achievement_awards_revision_idx` ON `achievement_awards` (`round_id`,`achievement_id`,`scope_id`,`revision`);