-- Add events table for event stream functionality
-- Similar to Redis Streams (XADD/XREAD) with cursor-based replay

CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`sequence` integer NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_channel_cursor` ON `events` (`channel`,`timestamp`,`sequence`);
--> statement-breakpoint
CREATE INDEX `idx_events_timestamp` ON `events` (`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_events_channel` ON `events` (`channel`);
