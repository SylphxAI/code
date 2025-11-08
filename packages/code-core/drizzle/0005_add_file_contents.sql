-- File Contents Storage Migration
-- Adds file_contents table for BLOB storage with auto-migration from base64

-- Create file_contents table for BLOB storage
CREATE TABLE IF NOT EXISTS `file_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`ordering` integer NOT NULL,
	`relative_path` text NOT NULL,
	`media_type` text NOT NULL,
	`size` integer NOT NULL,
	`content` text NOT NULL,
	`is_text` integer NOT NULL,
	`text_content` text,
	`sha256` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `message_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Create indexes for file_contents
CREATE INDEX IF NOT EXISTS `idx_file_contents_step_ordering` ON `file_contents` (`step_id`, `ordering`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_contents_type` ON `file_contents` (`media_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_contents_path` ON `file_contents` (`relative_path`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_file_contents_sha256` ON `file_contents` (`sha256`);

-- Note: messageUsage and stepTodoSnapshots tables are deprecated
-- - messageUsage: Usage is now computed on-demand from stepUsage
-- - stepTodoSnapshots: Todos are only sent on first user message after /compact
-- These tables can be dropped in a future migration after data migration is confirmed
