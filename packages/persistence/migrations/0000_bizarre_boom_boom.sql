CREATE TABLE `answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question_instance_id` text NOT NULL,
	`round_id` text NOT NULL,
	`player_id` text NOT NULL,
	`option_id` text NOT NULL,
	`received_at_ms` integer NOT NULL,
	`source_event_id` text,
	FOREIGN KEY (`question_instance_id`) REFERENCES `round_questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answers_question_player_uq` ON `answers` (`question_instance_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `answers_round_idx` ON `answers` (`round_id`);--> statement-breakpoint
CREATE TABLE `connection_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`detail` text,
	`created_at_ms` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `live_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `connection_events_session_idx` ON `connection_events` (`session_id`,`id`);--> statement-breakpoint
CREATE TABLE `game_snapshots` (
	`session_id` text NOT NULL,
	`state_version` integer NOT NULL,
	`state` text NOT NULL,
	`scene` text NOT NULL,
	`remaining_ms` integer,
	`engine_json` text NOT NULL,
	`pack_version` text,
	`created_at_ms` integer NOT NULL,
	PRIMARY KEY(`session_id`, `state_version`),
	FOREIGN KEY (`session_id`) REFERENCES `live_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`pack_id` text,
	`status` text NOT NULL,
	`provider` text,
	`request_json` text NOT NULL,
	`result_json` text,
	`estimated_cost_micros` integer,
	`error` text,
	`created_at_ms` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`finished_at_ms` integer,
	FOREIGN KEY (`pack_id`) REFERENCES `theme_packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leaderboard_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`round_id` text NOT NULL,
	`question_instance_id` text,
	`kind` text NOT NULL,
	`entries_json` text NOT NULL,
	`participant_count` integer NOT NULL,
	`created_at_ms` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leaderboard_snapshots_round_idx` ON `leaderboard_snapshots` (`round_id`);--> statement-breakpoint
CREATE TABLE `live_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`mode` text NOT NULL,
	`pack_id` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`config_json` text NOT NULL,
	`state_version` integer DEFAULT 0 NOT NULL,
	`last_heartbeat_ms` integer,
	`created_at_ms` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`closed_at_ms` integer
);
--> statement-breakpoint
CREATE TABLE `operator_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`command_type` text NOT NULL,
	`reason` text,
	`expected_state_version` integer NOT NULL,
	`result_state_version` integer NOT NULL,
	`accepted` integer NOT NULL,
	`result_json` text NOT NULL,
	`requested_at_ms` integer NOT NULL,
	`created_at_ms` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `live_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `operator_actions_session_idx` ON `operator_actions` (`session_id`,`created_at_ms`);--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`state_version` integer NOT NULL,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at_ms` integer NOT NULL,
	`published_at_ms` integer,
	FOREIGN KEY (`session_id`) REFERENCES `live_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outbox_session_idx` ON `outbox_events` (`session_id`,`id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`first_seen_at_ms` integer NOT NULL,
	`last_seen_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_source_user_uq` ON `players` (`source`,`source_user_id`);--> statement-breakpoint
CREATE TABLE `question_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text,
	`source_kind` text NOT NULL,
	`source_label` text NOT NULL,
	`excerpt` text,
	`locator` text,
	`observed_at_ms` integer,
	`confidence` integer,
	`access_level` text DEFAULT 'INTERNAL' NOT NULL,
	`created_at_ms` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `question_sources_question_idx` ON `question_sources` (`question_id`);--> statement-breakpoint
CREATE TABLE `question_versions` (
	`question_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`edited_by` text,
	`created_at_ms` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	PRIMARY KEY(`question_id`, `version`),
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`pack_id` text NOT NULL,
	`subtopic_id` text NOT NULL,
	`prompt` text NOT NULL,
	`options_json` text NOT NULL,
	`correct_option_id` text NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`difficulty` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`source_refs_json` text DEFAULT '[]' NOT NULL,
	`verification_status` text NOT NULL,
	`approval_status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`media_json` text,
	`valid_from_ms` integer,
	`valid_until_ms` integer,
	`last_used_at_ms` integer,
	`created_at_ms` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at_ms` integer,
	FOREIGN KEY (`pack_id`) REFERENCES `theme_packs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `questions_pack_status_idx` ON `questions` (`pack_id`,`approval_status`,`verification_status`);--> statement-breakpoint
CREATE INDEX `questions_subtopic_idx` ON `questions` (`subtopic_id`);--> statement-breakpoint
CREATE TABLE `round_players` (
	`round_id` text NOT NULL,
	`player_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`joined_at_ms` integer NOT NULL,
	PRIMARY KEY(`round_id`, `player_id`),
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `round_players_rank_idx` ON `round_players` (`round_id`,`score`);--> statement-breakpoint
CREATE TABLE `round_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`question_id` text NOT NULL,
	`question_version` integer NOT NULL,
	`position` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`correct_option_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`opened_at_ms` integer,
	`closed_at_ms` integer,
	`voided_at_ms` integer,
	`voided_after_reveal` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `round_questions_round_pos_uq` ON `round_questions` (`round_id`,`position`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`seed` integer NOT NULL,
	`selection_mode` text NOT NULL,
	`question_count` integer NOT NULL,
	`status` text DEFAULT 'PREPARED' NOT NULL,
	`pack_version` text,
	`started_at_ms` integer,
	`ended_at_ms` integer,
	`created_at_ms` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `live_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rounds_session_idx` ON `rounds` (`session_id`);--> statement-breakpoint
CREATE TABLE `score_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`round_id` text NOT NULL,
	`question_instance_id` text NOT NULL,
	`player_id` text NOT NULL,
	`score_reason` text NOT NULL,
	`points` integer NOT NULL,
	`created_at_ms` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_instance_id`) REFERENCES `round_questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `score_events_ledger_uq` ON `score_events` (`round_id`,`question_instance_id`,`player_id`,`score_reason`);--> statement-breakpoint
CREATE INDEX `score_events_round_player_idx` ON `score_events` (`round_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subtopics` (
	`id` text PRIMARY KEY NOT NULL,
	`pack_id` text NOT NULL,
	`name` text NOT NULL,
	`fact_kind` text DEFAULT 'GENERAL' NOT NULL,
	FOREIGN KEY (`pack_id`) REFERENCES `theme_packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `subtopics_pack_idx` ON `subtopics` (`pack_id`);--> statement-breakpoint
CREATE TABLE `theme_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`schema_version` integer NOT NULL,
	`pack_version` text NOT NULL,
	`manifest_json` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at_ms` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
