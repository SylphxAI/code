/**
 * Lens Builders with Optimistic Plugin
 *
 * Creates typed query/mutation builders with optimistic update support.
 * All operations should import { query, mutation } from this file.
 *
 * Features:
 * - Type-safe context (LensContext)
 * - Optimistic updates via .optimistic() method
 * - Live subscriptions via .subscribe() method
 */

import { lens } from "@sylphx/lens-core";
import { optimisticPlugin } from "@sylphx/lens-server";
import type { LensContext } from "./context.js";

/**
 * Create Lens builders with plugins
 *
 * Usage:
 * ```typescript
 * import { query, mutation } from "./builders.js";
 *
 * export const getSession = query()
 *   .input(z.object({ id: z.string() }))
 *   .returns(Session)
 *   .resolve(...)
 *   .subscribe(...)  // For live updates
 *
 * export const createSession = mutation()
 *   .input(...)
 *   .returns(Session)
 *   .optimistic("create")  // For optimistic updates
 *   .resolve(...)
 * ```
 */
const builders = lens<LensContext>().withPlugins([optimisticPlugin()]);

export const { query, mutation, plugins } = builders;
