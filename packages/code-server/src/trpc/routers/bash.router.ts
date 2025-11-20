/**
 * Bash Router
 * tRPC API for bash process management
 *
 * Endpoints:
 * - execute: Execute bash command (active/background)
 * - list: List all bash processes
 * - get: Get bash process info
 * - kill: Kill bash process
 * - demote: Convert active → background (Ctrl+B)
 * - promote: Convert background → active (wait for slot)
 * - subscribe: Subscribe to bash output stream (via events router)
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc.js";

const BashModeSchema = z.enum(["active", "background"]);
const BashStatusSchema = z.enum(["running", "completed", "failed", "killed", "timeout"]);

export const bashRouter = router({
	/**
	 * Execute bash command
	 *
	 * Usage:
	 * ```ts
	 * // Active bash (blocks if slot occupied)
	 * const bashId = await trpc.bash.execute.mutate({
	 *   command: 'npm run dev',
	 *   mode: 'active',
	 *   timeout: 120000
	 * })
	 *
	 * // Background bash (spawns immediately)
	 * const bashId = await trpc.bash.execute.mutate({
	 *   command: 'bun run build',
	 *   mode: 'background'
	 * })
	 * ```
	 */
	execute: publicProcedure
		.input(
			z.object({
				command: z.string().min(1),
				mode: BashModeSchema.default("active"),
				cwd: z.string().optional(),
				timeout: z.number().min(1000).max(600000).default(120000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { bashManagerV2 } = ctx.appContext;

			const bashId = await bashManagerV2.execute(input.command, {
				mode: input.mode,
				cwd: input.cwd,
				timeout: input.timeout,
			});

			return {
				bashId,
				command: input.command,
				mode: input.mode,
			};
		}),

	/**
	 * List all bash processes
	 */
	list: publicProcedure.query(({ ctx }) => {
		const { bashManagerV2 } = ctx.appContext;
		return bashManagerV2.list();
	}),

	/**
	 * Get bash process info
	 */
	get: publicProcedure
		.input(
			z.object({
				bashId: z.string(),
			}),
		)
		.query(({ ctx, input }) => {
			const { bashManagerV2 } = ctx.appContext;
			const proc = bashManagerV2.get(input.bashId);

			if (!proc) {
				throw new Error(`Bash process not found: ${input.bashId}`);
			}

			return {
				id: proc.id,
				command: proc.command,
				mode: proc.mode,
				status: proc.status,
				isActive: bashManagerV2.getActiveBashId() === proc.id,
				startTime: proc.startTime,
				endTime: proc.endTime,
				exitCode: proc.exitCode,
				cwd: proc.cwd,
				duration: (proc.endTime || Date.now()) - proc.startTime,
			};
		}),

	/**
	 * Kill bash process
	 */
	kill: publicProcedure
		.input(
			z.object({
				bashId: z.string(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const { bashManagerV2 } = ctx.appContext;
			const success = bashManagerV2.kill(input.bashId);

			if (!success) {
				throw new Error(`Failed to kill bash process: ${input.bashId}`);
			}

			return { success: true, bashId: input.bashId };
		}),

	/**
	 * Demote active bash → background (Ctrl+B)
	 */
	demote: publicProcedure
		.input(
			z.object({
				bashId: z.string(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const { bashManagerV2 } = ctx.appContext;
			const success = bashManagerV2.demote(input.bashId);

			if (!success) {
				throw new Error(`Failed to demote bash: ${input.bashId} (not active or not found)`);
			}

			return { success: true, bashId: input.bashId, mode: "background" };
		}),

	/**
	 * Promote background bash → active (waits for slot)
	 */
	promote: publicProcedure
		.input(
			z.object({
				bashId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { bashManagerV2 } = ctx.appContext;
			const success = await bashManagerV2.promote(input.bashId);

			if (!success) {
				throw new Error(`Failed to promote bash: ${input.bashId} (not background, not running, or not found)`);
			}

			return { success: true, bashId: input.bashId, mode: "active" };
		}),

	/**
	 * Get active bash info
	 */
	getActive: publicProcedure.query(({ ctx }) => {
		const { bashManagerV2 } = ctx.appContext;
		const activeBashId = bashManagerV2.getActiveBashId();

		if (!activeBashId) {
			return null;
		}

		const proc = bashManagerV2.get(activeBashId);
		if (!proc) return null;

		return {
			id: proc.id,
			command: proc.command,
			mode: proc.mode,
			status: proc.status,
			startTime: proc.startTime,
			cwd: proc.cwd,
			duration: (proc.endTime || Date.now()) - proc.startTime,
		};
	}),

	/**
	 * Get active queue length
	 */
	getActiveQueueLength: publicProcedure.query(({ ctx }) => {
		const { bashManagerV2 } = ctx.appContext;
		return { count: bashManagerV2.getActiveQueueLength() };
	}),
});

export type BashRouter = typeof bashRouter;
