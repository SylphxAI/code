-- Step-based message architecture migration
-- Creates new tables for steps, moves data from message_parts to step_parts

-- 0. Add missing enabled_rule_ids column to sessions table
ALTER TABLE `sessions` ADD `enabled_rule_ids` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint

-- 1. Create message_steps table
CREATE TABLE `message_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`provider` text,
	`model` text,
	`duration` integer,
	`finish_reason` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`metadata` text,
	`start_time` integer,
	`end_time` integer,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_steps_message` ON `message_steps` (`message_id`);
--> statement-breakpoint
CREATE INDEX `idx_message_steps_step_index` ON `message_steps` (`message_id`,`step_index`);
--> statement-breakpoint
CREATE INDEX `idx_message_steps_status` ON `message_steps` (`status`);
--> statement-breakpoint

-- 2. Create step_usage table
CREATE TABLE `step_usage` (
	`step_id` text PRIMARY KEY NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `message_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- 3. Create step_todo_snapshots table
CREATE TABLE `step_todo_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`todo_id` integer NOT NULL,
	`content` text NOT NULL,
	`active_form` text NOT NULL,
	`status` text NOT NULL,
	`ordering` integer NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `message_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_step_todo_snapshots_step` ON `step_todo_snapshots` (`step_id`);
--> statement-breakpoint

-- 4. Create step_parts table
CREATE TABLE `step_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`ordering` integer NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `message_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_step_parts_step` ON `step_parts` (`step_id`);
--> statement-breakpoint
CREATE INDEX `idx_step_parts_ordering` ON `step_parts` (`step_id`,`ordering`);
--> statement-breakpoint
CREATE INDEX `idx_step_parts_type` ON `step_parts` (`type`);
--> statement-breakpoint

-- 5. Migrate existing data from message_parts to step-0
-- Create step-0 for each message that has parts
INSERT INTO `message_steps` (`id`, `message_id`, `step_index`, `status`, `metadata`, `start_time`, `end_time`)
SELECT DISTINCT
  `message_id` || '-step-0',
  `message_id`,
  0,
  'completed',
  NULL,
  NULL,
  NULL
FROM `message_parts`;
--> statement-breakpoint

-- Migrate parts to new step_parts table
INSERT INTO `step_parts` (`id`, `step_id`, `ordering`, `type`, `content`)
SELECT
  `id`,
  `message_id` || '-step-0',
  `ordering`,
  `type`,
  `content`
FROM `message_parts`;
--> statement-breakpoint

-- 6. Migrate message_todo_snapshots to step_todo_snapshots
INSERT INTO `step_todo_snapshots` (`id`, `step_id`, `todo_id`, `content`, `active_form`, `status`, `ordering`)
SELECT
  `id`,
  `message_id` || '-step-0',
  `todo_id`,
  `content`,
  `active_form`,
  `status`,
  `ordering`
FROM `message_todo_snapshots`;
--> statement-breakpoint

-- 7. Drop old tables
DROP TABLE `message_parts`;
--> statement-breakpoint
DROP TABLE `message_todo_snapshots`;
