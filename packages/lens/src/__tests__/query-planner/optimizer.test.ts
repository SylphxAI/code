/**
 * Tests for Query Optimizer
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import { analyzeQuery } from '../../query-planner/analyzer.js';
import {
	generateExecutionPlan,
	decideStrategy,
	describePlan,
} from '../../query-planner/optimizer.js';

describe('Query Optimizer', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	describe('decideStrategy', () => {
		it('should choose JOIN for simple shallow queries', () => {
			defineResource({
				name: 'profile',
				fields: z.object({ id: z.string() }),
			});

			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
				relationships: {
					profile: belongsTo('profile', { foreignKey: 'profile_id' }),
				},
			});

			const analysis = analyzeQuery(User.definition, {
				profile: { select: { id: true } },
			});

			const strategy = decideStrategy(analysis);

			expect(strategy).toBe('join');
		});

		it('should choose BATCH for moderate complexity', () => {
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

			const analysis = analyzeQuery(Message.definition, {
				steps: { select: { id: true } },
			});

			const strategy = decideStrategy(analysis);

			expect(strategy).toBe('batch');
		});

		it('should choose LAZY for deep queries', () => {
			// Create 4 levels of nesting
			defineResource({
				name: 'level4',
				fields: z.object({ id: z.string() }),
			});

			defineResource({
				name: 'level3',
				fields: z.object({ id: z.string() }),
				relationships: {
					level4: hasMany('level4', { foreignKey: 'level3_id' }),
				},
			});

			defineResource({
				name: 'level2',
				fields: z.object({ id: z.string() }),
				relationships: {
					level3: hasMany('level3', { foreignKey: 'level2_id' }),
				},
			});

			const Level1 = defineResource({
				name: 'level1',
				fields: z.object({ id: z.string() }),
				relationships: {
					level2: hasMany('level2', { foreignKey: 'level1_id' }),
				},
			});

			const analysis = analyzeQuery(Level1.definition, {
				level2: {
					select: {
						level3: {
							select: {
								level4: { select: { id: true } },
							},
						},
					},
				},
			});

			const strategy = decideStrategy(analysis);

			expect(strategy).toBe('lazy');
		});

		it('should choose LAZY for many relationships', () => {
			// Create resource with many relationships
			for (let i = 1; i <= 12; i++) {
				defineResource({
					name: `rel${i}`,
					fields: z.object({ id: z.string() }),
				});
			}

			const relationships: any = {};
			for (let i = 1; i <= 12; i++) {
				relationships[`rel${i}`] = hasMany(`rel${i}`, { foreignKey: 'parent_id' });
			}

			const Parent = defineResource({
				name: 'parent',
				fields: z.object({ id: z.string() }),
				relationships,
			});

			const selection: any = {};
			for (let i = 1; i <= 12; i++) {
				selection[`rel${i}`] = { select: { id: true } };
			}

			const analysis = analyzeQuery(Parent.definition, selection);

			const strategy = decideStrategy(analysis);

			expect(strategy).toBe('lazy');
		});
	});

	describe('generateExecutionPlan', () => {
		it('should generate JOIN plan for simple query', () => {
			defineResource({
				name: 'profile',
				fields: z.object({ id: z.string() }),
			});

			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
				relationships: {
					profile: belongsTo('profile', { foreignKey: 'profile_id' }),
				},
			});

			const plan = generateExecutionPlan(User.definition, {
				id: true,
				profile: { select: { id: true } },
			});

			expect(plan.strategy).toBe('join');
			expect(plan.steps).toHaveLength(1);
			expect(plan.steps[0].type).toBe('root');
			expect(plan.steps[0].strategy).toBe('join');
		});

		it('should generate BATCH plan for hasMany relationship', () => {
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
				id: true,
				steps: { select: { id: true } },
			});

			expect(plan.strategy).toBe('batch');
			expect(plan.steps.length).toBeGreaterThan(1);
			expect(plan.steps[0].type).toBe('root');
			expect(plan.steps[0].resource).toBe('message');
		});

		it('should generate BATCH plan for nested relationships', () => {
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
				id: true,
				steps: {
					select: {
						id: true,
						parts: { select: { id: true } },
					},
				},
			});

			expect(plan.strategy).toBe('batch');
			expect(plan.steps.length).toBeGreaterThan(1);
		});

		it('should mark steps as parallelizable when possible', () => {
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

			// Steps that only depend on root should be parallelizable
			const relationshipSteps = plan.steps.filter((s) => s.type === 'relationship');
			expect(relationshipSteps.some((s) => s.parallelizable)).toBe(true);
		});

		it('should track optimizations applied', () => {
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

			expect(plan.optimizations.length).toBeGreaterThan(0);
			expect(plan.optimizations[0]).toContain('N+1');
		});

		it('should estimate query count correctly', () => {
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

			// Should have same or fewer queries than unoptimized
			// With batching: root + batched relationship = 2 queries (vs N+1 without batching)
			expect(plan.estimatedQueries).toBeLessThanOrEqual(
				plan.analysis.estimatedQueries
			);
		});
	});

	describe('describePlan', () => {
		it('should produce human-readable description', () => {
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

			const description = describePlan(plan);

			expect(description).toContain('Execution Plan');
			expect(description).toContain('BATCH');
			expect(description).toContain('Steps:');
			expect(description).toContain('Estimated queries:');
			expect(description).toContain('Optimizations:');
		});
	});
});
