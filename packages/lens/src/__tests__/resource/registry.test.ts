/**
 * Tests for Resource Registry
 */

import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { z } from 'zod';
import { ResourceRegistry } from '../../resource/registry.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import type { ResourceDefinition } from '../../resource/types.js';

describe('ResourceRegistry', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	describe('register', () => {
		it('should register a resource', () => {
			const definition: ResourceDefinition = {
				name: 'user',
				fields: z.object({ id: z.string() }),
			};

			ResourceRegistry.register(definition);

			expect(ResourceRegistry.has('user')).toBe(true);
			expect(ResourceRegistry.get('user')).toEqual(definition);
		});

		it('should throw if resource name already registered', () => {
			const definition: ResourceDefinition = {
				name: 'user',
				fields: z.object({ id: z.string() }),
			};

			ResourceRegistry.register(definition);

			expect(() => {
				ResourceRegistry.register(definition);
			}).toThrow('already registered');
		});

		it('should throw if resource name is empty', () => {
			expect(() => {
				ResourceRegistry.register({
					name: '',
					fields: z.object({ id: z.string() }),
				});
			}).toThrow('Resource name cannot be empty');
		});

		it('should throw if resource name is whitespace', () => {
			expect(() => {
				ResourceRegistry.register({
					name: '   ',
					fields: z.object({ id: z.string() }),
				});
			}).toThrow('Resource name cannot be empty');
		});

		it('should throw if fields schema is missing', () => {
			expect(() => {
				ResourceRegistry.register({
					name: 'user',
					fields: undefined as any,
				});
			}).toThrow('missing fields schema');
		});
	});

	describe('get', () => {
		it('should get registered resource', () => {
			const definition: ResourceDefinition = {
				name: 'user',
				fields: z.object({ id: z.string() }),
			};

			ResourceRegistry.register(definition);

			const retrieved = ResourceRegistry.get('user');
			expect(retrieved).toEqual(definition);
		});

		it('should return undefined for non-existent resource', () => {
			const retrieved = ResourceRegistry.get('nonexistent');
			expect(retrieved).toBeUndefined();
		});
	});

	describe('has', () => {
		it('should return true for registered resource', () => {
			ResourceRegistry.register({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			expect(ResourceRegistry.has('user')).toBe(true);
		});

		it('should return false for non-existent resource', () => {
			expect(ResourceRegistry.has('nonexistent')).toBe(false);
		});
	});

	describe('list', () => {
		it('should return empty array when no resources registered', () => {
			expect(ResourceRegistry.list()).toEqual([]);
		});

		it('should return all registered resource names', () => {
			ResourceRegistry.register({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});
			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});
			ResourceRegistry.register({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			const names = ResourceRegistry.list();
			expect(names).toHaveLength(3);
			expect(names).toContain('user');
			expect(names).toContain('message');
			expect(names).toContain('step');
		});
	});

	describe('clear', () => {
		it('should clear all registered resources', () => {
			ResourceRegistry.register({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});
			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			expect(ResourceRegistry.list()).toHaveLength(2);

			ResourceRegistry.clear();

			expect(ResourceRegistry.list()).toHaveLength(0);
			expect(ResourceRegistry.has('user')).toBe(false);
			expect(ResourceRegistry.has('message')).toBe(false);
		});
	});

	describe('relationship validation', () => {
		it('should warn if relationship target not registered', () => {
			const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {});

			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('to undefined resource "step"')
			);

			consoleSpy.mockRestore();
		});

		it('should not warn if relationship target is registered', () => {
			const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {});

			// Register target first
			ResourceRegistry.register({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			// Then register resource with relationship
			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should throw if relationship type is missing', () => {
			expect(() => {
				ResourceRegistry.register({
					name: 'message',
					fields: z.object({ id: z.string() }),
					relationships: {
						steps: {
							type: undefined,
							target: 'step',
							foreignKey: 'message_id',
						} as any,
					},
				});
			}).toThrow('missing type');
		});

		it('should throw if relationship target is missing', () => {
			expect(() => {
				ResourceRegistry.register({
					name: 'message',
					fields: z.object({ id: z.string() }),
					relationships: {
						steps: {
							type: 'hasMany',
							target: undefined,
							foreignKey: 'message_id',
						} as any,
					},
				});
			}).toThrow('missing target');
		});
	});

	describe('validateAllRelationships', () => {
		it('should pass when all relationship targets exist', () => {
			ResourceRegistry.register({
				name: 'session',
				fields: z.object({ id: z.string() }),
			});
			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});
			ResourceRegistry.register({
				name: 'step',
				fields: z.object({ id: z.string() }),
				relationships: {
					message: belongsTo('message', { foreignKey: 'message_id' }),
				},
			});

			expect(() => {
				ResourceRegistry.validateAllRelationships();
			}).not.toThrow();
		});

		it('should throw when relationship target does not exist', () => {
			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
					session: belongsTo('session', { foreignKey: 'session_id' }),
				},
			});

			expect(() => {
				ResourceRegistry.validateAllRelationships();
			}).toThrow('Registry validation failed');
			expect(() => {
				ResourceRegistry.validateAllRelationships();
			}).toThrow('references undefined resource "step"');
			expect(() => {
				ResourceRegistry.validateAllRelationships();
			}).toThrow('references undefined resource "session"');
		});

		it('should list all missing relationship targets', () => {
			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
					session: belongsTo('session', { foreignKey: 'session_id' }),
				},
			});

			try {
				ResourceRegistry.validateAllRelationships();
				expect(true).toBe(false); // Should not reach here
			} catch (error: any) {
				expect(error.message).toContain('"step"');
				expect(error.message).toContain('"session"');
			}
		});

		it('should handle resources with no relationships', () => {
			ResourceRegistry.register({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});
			ResourceRegistry.register({
				name: 'session',
				fields: z.object({ id: z.string() }),
			});

			expect(() => {
				ResourceRegistry.validateAllRelationships();
			}).not.toThrow();
		});
	});

	describe('multiple resources', () => {
		it('should handle multiple resources with cross-references', () => {
			const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {});

			ResourceRegistry.register({
				name: 'session',
				fields: z.object({ id: z.string() }),
				relationships: {
					messages: hasMany('message', { foreignKey: 'session_id' }),
				},
			});

			ResourceRegistry.register({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					session: belongsTo('session', { foreignKey: 'session_id' }),
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			ResourceRegistry.register({
				name: 'step',
				fields: z.object({ id: z.string() }),
				relationships: {
					message: belongsTo('message', { foreignKey: 'message_id' }),
				},
			});

			// All relationships should resolve
			expect(() => {
				ResourceRegistry.validateAllRelationships();
			}).not.toThrow();

			consoleSpy.mockRestore();
		});
	});
});
