CREATE TABLE `ranking_snapshots` (
	`round_id` text NOT NULL,
	`scope` text NOT NULL,
	`scope_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`revision` integer NOT NULL,
	`entries_json` text NOT NULL,
	`finalized_at_ms` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ranking_snapshots_revision_uq` ON `ranking_snapshots` (`round_id`,`achievement_id`,`scope_id`,`revision`);--> statement-breakpoint
CREATE INDEX `ranking_snapshots_lookup_idx` ON `ranking_snapshots` (`round_id`,`scope`,`achievement_id`,`scope_id`,`revision`);--> statement-breakpoint
CREATE INDEX `score_events_round_question_idx` ON `score_events` (`round_id`,`question_instance_id`);