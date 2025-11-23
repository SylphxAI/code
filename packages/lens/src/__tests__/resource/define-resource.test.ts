/**
 * Tests for defineResource() API
 */

import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo, hasOne } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';

describe('defineResource', () => {
	beforeEach(() => {
		// Clear registry before each test
		ResourceRegistry.clear();
	});

	describe('basic resource definition', () => {
		it('should define a simple resource', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({
					id: z.string(),
					name: z.string(),
				}),
			});

			expect(User.name).toBe('user');
			expect(User.definition.name).toBe('user');
			expect(User.definition.fields).toBeDefined();
		});

		it('should register resource in global registry', () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			expect(ResourceRegistry.has('user')).toBe(true);
		});

		it('should infer entity type from fields', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({
					id: z.string(),
					name: z.string(),
					age: z.number(),
				}),
			});

			// Type test - this should compile without errors
			type UserEntity = typeof User.entity;
			const user: UserEntity = {
				id: '123',
				name: 'John',
				age: 30,
			};

			expect(user).toBeDefined();
		});
	});

	describe('validation', () => {
		it('should throw if name is empty', () => {
			expect(() => {
				defineResource({
					name: '',
					fields: z.object({ id: z.string() }),
				});
			}).toThrow('Resource name cannot be empty');
		});

		it('should throw if name is not camelCase', () => {
			expect(() => {
				defineResource({
					name: 'User',
					fields: z.object({ id: z.string() }),
				});
			}).toThrow('must be camelCase');

			expect(() => {
				defineResource({
					name: 'user_name',
					fields: z.object({ id: z.string() }),
				});
			}).toThrow('must be camelCase');

			expect(() => {
				defineResource({
					name: 'user name',
					fields: z.object({ id: z.string() }),
				});
			}).toThrow('must be camelCase');
		});

		it('should throw if fields schema is missing', () => {
			expect(() => {
				defineResource({
					name: 'user',
					fields: undefined as any,
				});
			}).toThrow('missing fields schema');
		});

		it('should throw if duplicate name', () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			expect(() => {
				defineResource({
					name: 'user',
					fields: z.object({ id: z.string() }),
				});
			}).toThrow('already registered');
		});

		it('should throw if computed field is not a function', () => {
			expect(() => {
				defineResource({
					name: 'user',
					fields: z.object({ id: z.string() }),
					computed: {
						invalid: 'not a function' as any,
					},
				});
			}).toThrow('must be a function');
		});

		it('should throw if hook is not a function', () => {
			expect(() => {
				defineResource({
					name: 'user',
					fields: z.object({ id: z.string() }),
					hooks: {
						beforeCreate: 'not a function' as any,
					},
				});
			}).toThrow('must be a function');
		});

		it('should throw if invalid hook name', () => {
			expect(() => {
				defineResource({
					name: 'user',
					fields: z.object({ id: z.string() }),
					hooks: {
						invalidHook: async () => {},
					} as any,
				});
			}).toThrow('invalid hook');
		});

		it('should throw if tableName is invalid', () => {
			expect(() => {
				defineResource({
					name: 'user',
					fields: z.object({ id: z.string() }),
					tableName: '',
				});
			}).toThrow('invalid tableName');
		});
	});

	describe('relationships', () => {
		it('should define resource with hasMany relationship', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			expect(Message.relationships.steps).toBeDefined();
			expect(Message.relationships.steps.type).toBe('hasMany');
			expect(Message.relationships.steps.target).toBe('step');
			expect(Message.relationships.steps.foreignKey).toBe('message_id');
		});

		it('should define resource with belongsTo relationship', () => {
			const Step = defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
				relationships: {
					message: belongsTo('message', { foreignKey: 'message_id' }),
				},
			});

			expect(Step.relationships.message).toBeDefined();
			expect(Step.relationships.message.type).toBe('belongsTo');
			expect(Step.relationships.message.target).toBe('message');
		});

		it('should define resource with multiple relationships', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					session: belongsTo('session', { foreignKey: 'session_id' }),
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			expect(Object.keys(Message.relationships)).toHaveLength(2);
			expect(Message.relationships.session.type).toBe('belongsTo');
			expect(Message.relationships.steps.type).toBe('hasMany');
		});

		it('should warn if relationship target not registered', () => {
			const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {});

			defineResource({
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
	});

	describe('computed fields', () => {
		it('should define resource with computed field', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({
					firstName: z.string(),
					lastName: z.string(),
				}),
				computed: {
					fullName: (user) => `${user.firstName} ${user.lastName}`,
				},
			});

			expect(User.definition.computed?.fullName).toBeDefined();
			expect(typeof User.definition.computed?.fullName).toBe('function');
		});

		it('should define async computed field', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				computed: {
					totalTokens: async (message, ctx) => {
						const steps = await ctx.loader.load('step', message.id);
						return 100; // Mock value
					},
				},
			});

			expect(Message.definition.computed?.totalTokens).toBeDefined();
		});
	});

	describe('hooks', () => {
		it('should define resource with lifecycle hooks', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string(), name: z.string() }),
				hooks: {
					beforeCreate: (data) => {
						return { ...data, createdAt: new Date() };
					},
					afterCreate: (entity) => {
						console.log('Created:', entity);
					},
				},
			});

			expect(User.definition.hooks?.beforeCreate).toBeDefined();
			expect(User.definition.hooks?.afterCreate).toBeDefined();
		});

		it('should support all valid hooks', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
				hooks: {
					beforeCreate: async (data) => data,
					afterCreate: async (entity) => {},
					beforeUpdate: async (id, data) => data,
					afterUpdate: async (entity) => {},
					beforeDelete: async (id) => {},
					afterDelete: async (id) => {},
				},
			});

			expect(Object.keys(User.definition.hooks || {})).toHaveLength(6);
		});
	});

	describe('table name', () => {
		it('should use custom table name if provided', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
				tableName: 'custom_users',
			});

			expect(User.definition.tableName).toBe('custom_users');
		});

		it('should have no tableName if not provided', () => {
			const User = defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			expect(User.definition.tableName).toBeUndefined();
		});
	});
});
