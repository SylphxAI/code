/**
 * Tests for Query Analyzer
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import {
	analyzeQuery,
	calculateComplexity,
	describeAnalysis,
} from '../../query-planner/analyzer.js';

describe('Query Analyzer', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	describe('analyzeQuery', () => {
		it('should analyze simple query with no relationships', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({
					id: z.string(),
					name: z.string(),
				}),
			});

			const analysis = analyzeQuery(User.definition, {
				id: true,
				name: true,
			});

			expect(analysis.depth).toBe(0);
			expect(analysis.relationships).toHaveLength(0);
			expect(analysis.estimatedQueries).toBe(1);
			expect(analysis.hasNPlusOne).toBe(false);
		});

		it('should analyze query with single relationship', () => {
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
				id: true,
				steps: { select: { id: true } },
			});

			expect(analysis.depth).toBe(1);
			expect(analysis.relationships).toEqual(['steps']);
			expect(analysis.estimatedQueries).toBe(2);
			expect(analysis.hasNPlusOne).toBe(true); // hasMany causes N+1
		});

		it('should analyze nested relationships', () => {
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

			const analysis = analyzeQuery(Message.definition, {
				id: true,
				steps: {
					select: {
						id: true,
						parts: { select: { id: true } },
					},
				},
			});

			expect(analysis.depth).toBe(2);
			expect(analysis.relationships).toEqual(['steps', 'parts']);
			expect(analysis.estimatedQueries).toBe(3);
			expect(analysis.hasNPlusOne).toBe(true);
		});

		it('should detect N+1 in hasMany relationships', () => {
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

			expect(analysis.hasNPlusOne).toBe(true);
			expect(analysis.traversalTree[0].causesNPlusOne).toBe(true);
		});

		it('should not flag N+1 for belongsTo relationships', () => {
			defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const Step = defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
				relationships: {
					message: belongsTo('message', { foreignKey: 'message_id' }),
				},
			});

			const analysis = analyzeQuery(Step.definition, {
				message: { select: { id: true } },
			});

			expect(analysis.hasNPlusOne).toBe(false);
			expect(analysis.traversalTree[0].causesNPlusOne).toBe(false);
		});

		it('should track relationships by depth', () => {
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

			const analysis = analyzeQuery(Message.definition, {
				steps: {
					select: {
						parts: { select: { id: true } },
					},
				},
			});

			expect(analysis.relationshipsByDepth.get(1)).toBe(1); // steps
			expect(analysis.relationshipsByDepth.get(2)).toBe(1); // parts
		});

		it('should handle multiple relationships at same level', () => {
			defineResource({
				name: 'session',
				fields: z.object({ id: z.string() }),
			});

			defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					session: belongsTo('session', { foreignKey: 'session_id' }),
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const analysis = analyzeQuery(Message.definition, {
				session: { select: { id: true } },
				steps: { select: { id: true } },
			});

			expect(analysis.depth).toBe(1);
			expect(analysis.relationships).toContain('session');
			expect(analysis.relationships).toContain('steps');
			expect(analysis.relationshipsByDepth.get(1)).toBe(2);
		});
	});

	describe('calculateComplexity', () => {
		it('should calculate low complexity for simple queries', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const analysis = analyzeQuery(User.definition, { id: true });
			const complexity = calculateComplexity(analysis);

			// depth=0: 2^0=1, relationships=0, hasMany=0
			// Score = 1 + 0 + 0 = 1
			expect(complexity).toBe(1);
		});

		it('should calculate higher complexity for nested queries', () => {
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

			const analysis = analyzeQuery(Message.definition, {
				steps: {
					select: {
						parts: { select: { id: true } },
					},
				},
			});

			const complexity = calculateComplexity(analysis);

			// depth=2: 2^2=4
			// relationships=2: 2*5=10
			// hasMany=2: 2*10=20
			// Score = 4 + 10 + 20 = 34
			expect(complexity).toBeGreaterThan(20);
		});

		it('should penalize hasMany relationships', () => {
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

			const complexity = calculateComplexity(analysis);

			// Should have hasMany penalty
			expect(complexity).toBeGreaterThan(10);
		});
	});

	describe('describeAnalysis', () => {
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

			const analysis = analyzeQuery(Message.definition, {
				steps: { select: { id: true } },
			});

			const description = describeAnalysis(analysis);

			expect(description).toContain('Query Analysis:');
			expect(description).toContain('Depth: 1');
			expect(description).toContain('Relationships: 1');
			expect(description).toContain('N+1 issues: YES');
			expect(description).toContain('steps');
		});
	});
});
