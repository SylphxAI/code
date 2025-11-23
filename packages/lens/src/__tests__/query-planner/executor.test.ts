/**
 * Tests for Query Executor
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import { generateExecutionPlan } from '../../query-planner/optimizer.js';
import {
	executeQuery,
	executeQueryParallel,
	getExecutionStats,
} from '../../query-planner/executor.js';
import type { QueryContext } from '../../resource/types.js';

describe('Query Executor', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	// Mock query context
	const mockContext: QueryContext = {
		loader: {
			load: async () => null,
			loadMany: async () => [],
			loadByField: async () => new Map(),
			prime: () => {},
			clear: () => {},
		},
		db: {},
		eventStream: {
			publish: async () => {},
			subscribe: () => ({} as any),
		},
		requestId: 'test-request',
	};

	describe('executeQuery', () => {
		it('should execute simple query plan', async () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const plan = generateExecutionPlan(User.definition, { id: true });

			const result = await executeQuery(plan, mockContext);

			expect(result).toBeDefined();
			expect(result.plan).toBe(plan);
			expect(result.queryCount).toBe(plan.steps.length);
			expect(result.totalTime).toBeGreaterThanOrEqual(0);
		});

		it('should execute plan with relationships', async () => {
			defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const plan = generateExecutionPlan(Message.definition, {
				steps: { select: { id: true } },
			});

			const result = await executeQuery(plan, mockContext);

			expect(result.steps.length).toBe(plan.steps.length);
			expect(result.data).toBeDefined();
		});

		it('should track execution time for each step', async () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const plan = generateExecutionPlan(User.definition, { id: true });

			const result = await executeQuery(plan, mockContext);

			for (const stepResult of result.steps) {
				expect(stepResult.executionTime).toBeGreaterThanOrEqual(0);
			}
		});

		it('should return step results in order', async () => {
			defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const plan = generateExecutionPlan(Message.definition, {
				steps: { select: { id: true } },
			});

			const result = await executeQuery(plan, mockContext);

			expect(result.steps.length).toBe(plan.steps.length);

			// Steps should be in order
			for (let i = 0; i < result.steps.length; i++) {
				expect(result.steps[i].step).toBe(plan.steps[i]);
			}
		});
	});

	describe('executeQueryParallel', () => {
		it('should execute parallelizable steps concurrently', async () => {
			defineResource({
				name: 'step1',
				fields: z.object({ id: z.string() }),
			});

			defineResource({
				name: 'step2',
				fields: z.object({ id: z.string() }),
			});

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					step1: hasMany('step1', { foreignKey: 'message_id' }),
					step2: hasMany('step2', { foreignKey: 'message_id' }),
				},
			});

			const plan = generateExecutionPlan(Message.definition, {
				step1: { select: { id: true } },
				step2: { select: { id: true } },
			});

			const result = await executeQueryParallel(plan, mockContext);

			expect(result.steps.length).toBe(plan.steps.length);
			expect(result.queryCount).toBe(plan.steps.length);
		});

		it('should respect step dependencies', async () => {
			defineResource({
				name: 'part',
				fields: z.object({ id: z.string() }),
			});

			defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
				relationships: {
					parts: hasMany('part', { foreignKey: 'step_id' }),
				},
			});

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const plan = generateExecutionPlan(Message.definition, {
				steps: {
					select: {
						parts: { select: { id: true } },
					},
				},
			});

			const result = await executeQueryParallel(plan, mockContext);

			// All steps should have been executed
			expect(result.steps.length).toBe(plan.steps.length);
		});
	});

	describe('getExecutionStats', () => {
		it('should calculate statistics from execution result', async () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const plan = generateExecutionPlan(User.definition, { id: true });
			const result = await executeQuery(plan, mockContext);

			const stats = getExecutionStats(result);

			expect(stats.avgStepTime).toBeGreaterThanOrEqual(0);
			expect(stats.totalRows).toBeGreaterThanOrEqual(0);
			expect(stats.efficiency).toBeGreaterThanOrEqual(0);
		});

		it('should identify slowest and fastest steps', async () => {
			defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const plan = generateExecutionPlan(Message.definition, {
				steps: { select: { id: true } },
			});

			const result = await executeQuery(plan, mockContext);

			const stats = getExecutionStats(result);

			if (result.steps.length > 0) {
				expect(stats.slowestStep).toBeDefined();
				expect(stats.fastestStep).toBeDefined();
			}
		});

		it('should handle empty results', () => {
			const result = {
				data: [],
				steps: [],
				totalTime: 0,
				queryCount: 0,
				plan: {} as any,
			};

			const stats = getExecutionStats(result);

			expect(stats.avgStepTime).toBe(0);
			expect(stats.slowestStep).toBeNull();
			expect(stats.fastestStep).toBeNull();
			expect(stats.totalRows).toBe(0);
			expect(stats.efficiency).toBe(0);
		});
	});

	describe('step execution', () => {
		it('should execute root step first', async () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const plan = generateExecutionPlan(User.definition, { id: true });

			const result = await executeQuery(plan, mockContext);

			expect(result.steps[0].step.type).toBe('root');
		});

		it('should execute relationship steps after dependencies', async () => {
			defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const plan = generateExecutionPlan(Message.definition, {
				steps: { select: { id: true } },
			});

			const result = await executeQuery(plan, mockContext);

			// Root should be first
			expect(result.steps[0].step.type).toBe('root');

			// Relationship steps should come after
			const relationshipSteps = result.steps.filter(
				(s) => s.step.type === 'relationship'
			);

			for (const step of relationshipSteps) {
				// All dependencies should be executed before this step
				for (const depIndex of step.step.dependencies) {
					expect(depIndex).toBeLessThan(result.steps.indexOf(step));
				}
			}
		});
	});
});
