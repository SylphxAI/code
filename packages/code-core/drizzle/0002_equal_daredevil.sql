PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_file_contents` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`ordering` integer NOT NULL,
	`relative_path` text NOT NULL,
	`media_type` text NOT NULL,
	`size` integer NOT NULL,
	`storage_key` text NOT NULL,
	`is_text` integer NOT NULL,
	`text_content` text,
	`sha256` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `message_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_file_contents`("id", "step_id", "ordering", "relative_path", "media_type", "size", "storage_key", "is_text", "text_content", "sha256", "created_at") SELECT "id", "step_id", "ordering", "relative_path", "media_type", "size", "storage_key", "is_text", "text_content", "sha256", "created_at" FROM `file_contents`;--> statement-breakpoint
DROP TABLE `file_contents`;--> statement-breakpoint
ALTER TABLE `__new_file_contents` RENAME TO `file_contents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_file_contents_step_ordering` ON `file_contents` (`step_id`,`ordering`);--> statement-breakpoint
CREATE INDEX `idx_file_contents_type` ON `file_contents` (`media_type`);--> statement-breakpoint
CREATE INDEX `idx_file_contents_path` ON `file_contents` (`relative_path`);--> statement-breakpoint
CREATE INDEX `idx_file_contents_sha256` ON `file_contents` (`sha256`);