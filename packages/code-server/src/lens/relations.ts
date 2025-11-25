/**
 * Lens Relation Definitions
 *
 * Defines relationships between entities.
 * These enable nested data loading with field selection.
 *
 * Example usage:
 * ```typescript
 * // Fetch session with messages and their steps
 * const session = await api.queries.getSession({ id })
 *   .select({
 *     title: true,
 *     messages: {
 *       select: {
 *         role: true,
 *         steps: { select: { status: true } }
 *       }
 *     }
 *   })
 * ```
 */

import { relation, hasMany, belongsTo, hasOne } from "@lens/core";
import { Session, Message, Step, Part, StepUsage, Todo } from "./entities.js";

/**
 * All entity relations
 *
 * Hierarchy:
 * - Session has many Messages, Todos
 * - Message belongs to Session, has many Steps
 * - Step belongs to Message, has many Parts, has one StepUsage
 * - Part belongs to Step
 * - StepUsage belongs to Step
 * - Todo belongs to Session
 */
export const relations = [
	// Session relations
	relation(Session, {
		messages: hasMany(Message, (e) => e.sessionId),
		todos: hasMany(Todo, (e) => e.sessionId),
	}),

	// Message relations
	relation(Message, {
		session: belongsTo(Session, (e) => e.sessionId),
		steps: hasMany(Step, (e) => e.messageId),
	}),

	// Step relations
	relation(Step, {
		message: belongsTo(Message, (e) => e.messageId),
		parts: hasMany(Part, (e) => e.stepId),
		usage: hasOne(StepUsage, (e) => e.stepId),
	}),

	// Part relations
	relation(Part, {
		step: belongsTo(Step, (e) => e.stepId),
	}),

	// StepUsage relations
	relation(StepUsage, {
		step: belongsTo(Step, (e) => e.stepId),
	}),

	// Todo relations
	relation(Todo, {
		session: belongsTo(Session, (e) => e.sessionId),
	}),
];
