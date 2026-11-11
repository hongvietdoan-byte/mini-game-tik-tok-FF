CREATE TABLE `processed_events` (
	`source` text NOT NULL,
	`event_id` text NOT NULL,
	`question_instance_id` text NOT NULL,
	`received_at_ms` integer NOT NULL,
	PRIMARY KEY(`source`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `processed_events_received_idx` ON `processed_events` (`received_at_ms`);