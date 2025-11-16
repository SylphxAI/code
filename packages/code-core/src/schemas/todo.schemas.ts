/**
 * Todo Schemas
 * Shared Zod schemas for todo validation
 */

import { z } from "zod";

/**
 * Todo Status schema
 */
export const TodoStatusSchema = z.enum(["pending", "in_progress", "completed", "removed"]);

/**
 * Todo Metadata schema
 */
export const TodoMetadataSchema = z.object({
	tags: z.array(z.string()).optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	estimatedMinutes: z.number().optional(),
	dependencies: z.array(z.number()).optional(),
});

/**
 * Todo schema
 */
export const TodoSchema = z.object({
	id: z.number(),
	content: z.string(),
	status: TodoStatusSchema,
	activeForm: z.string(),
	ordering: z.number(),
	createdByToolId: z.string().optional(),
	createdByStepId: z.string().optional(),
	relatedFiles: z.array(z.string()).optional(),
	metadata: TodoMetadataSchema.optional(),
});

/**
 * Todo Update schema
 */
export const TodoUpdateSchema = z.object({
	id: z.number().optional(),
	content: z.string().optional(),
	activeForm: z.string().optional(),
	status: TodoStatusSchema.optional(),
	reorder: z
		.object({
			type: z.enum(["before", "after", "top", "last"]),
			id: z.number().optional(),
		})
		.optional(),
});

/**
 * Type exports
 */
export type Todo = z.infer<typeof TodoSchema>;
export type TodoStatus = z.infer<typeof TodoStatusSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
