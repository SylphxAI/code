/**
 * Lens Context Type Definitions
 *
 * Context is passed directly to resolvers via `ctx` parameter (tRPC-style).
 * No AsyncLocalStorage needed - Lens server handles context injection.
 *
 * Usage in resolvers:
 * ```typescript
 * .resolve(async ({ input, ctx }) => {
 *   return ctx.db.session.findUnique({ where: { id: input.id } });
 * })
 * ```
 */
export {};
//# sourceMappingURL=context.js.map