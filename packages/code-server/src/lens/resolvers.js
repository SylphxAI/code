/**
 * Lens Entity Resolvers Factory (Stub)
 *
 * Note: Field resolvers are optional in lens-server.
 * This file is stubbed for future implementation.
 *
 * TODO: Implement using lens-core resolver() API:
 * ```typescript
 * import { resolver } from "@lens/core";
 * import { Session, Message, Step, Part, Todo } from "./entities.js";
 *
 * const sessionResolver = resolver(Session, (f) => ({
 *   messages: f.many(Message).resolve(({ parent, ctx }) =>
 *     ctx.db.message.findMany({ where: { sessionId: parent.id } })
 *   ),
 *   todos: f.many(Todo).resolve(({ parent, ctx }) =>
 *     ctx.db.todo.findMany({ where: { sessionId: parent.id } })
 *   ),
 * }));
 * ```
 */
/**
 * Create entity resolvers with db access via closure
 *
 * Currently returns empty array - resolvers are optional.
 * Lens handles nested data loading via entity field selection.
 */
export function createResolvers(_db) {
    // Resolvers are optional - return empty array for now
    // TODO: Implement proper field resolvers using resolver() API
    return [];
}
//# sourceMappingURL=resolvers.js.map