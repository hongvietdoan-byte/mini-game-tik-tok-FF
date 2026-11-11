CREATE TABLE `audience_states` (
	`round_id` text PRIMARY KEY NOT NULL,
	`rotation_id` integer NOT NULL,
	`state_json` text NOT NULL,
	`updated_at_ms` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `character_assignments` (
	`round_id` text NOT NULL,
	`player_id` text NOT NULL,
	`character_id` text NOT NULL,
	`assigned_at_ms` integer NOT NULL,
	PRIMARY KEY(`round_id`, `player_id`),
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
