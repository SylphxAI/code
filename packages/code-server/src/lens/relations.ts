/**
 * Lens Relations (Deprecated)
 *
 * Relations are now defined inline on entities using:
 * - t.many(() => Entity) for 1:N relations
 * - t.one(() => Entity) for 1:1 relations
 *
 * See entities.ts for relation definitions:
 * - Message.steps: t.many(() => Step)
 * - Step.parts: t.many(() => Part)
 *
 * This file is kept for backwards compatibility but exports empty array.
 */

export const relations: unknown[] = [];
