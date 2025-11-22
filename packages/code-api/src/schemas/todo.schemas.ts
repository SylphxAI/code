import { z } from "zod";

export const TodoSchema = z.object({
	id: z.number(),
	sessionId: z.string(),
	content: z.string(),
	activeForm: z.string(),
	status: z.enum(["pending", "in_progress", "completed"]),
	ordering: z.number(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const TodoSnapshotSchema = z.object({
	id: z.number(),
	content: z.string(),
	activeForm: z.string(),
	status: z.enum(["pending", "in_progress", "completed"]),
	ordering: z.number(),
});

export type TodoSnapshot = z.infer<typeof TodoSnapshotSchema>;
