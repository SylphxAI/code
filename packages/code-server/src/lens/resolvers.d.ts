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
import type { LensDB } from "./context.js";
import type { Resolvers } from "@sylphx/lens-core";
/**
 * Create entity resolvers with db access via closure
 *
 * Currently returns empty array - resolvers are optional.
 * Lens handles nested data loading via entity field selection.
 */
export declare function createResolvers(_db: LensDB): Resolvers;
//# sourceMappingURL=resolvers.d.ts.map