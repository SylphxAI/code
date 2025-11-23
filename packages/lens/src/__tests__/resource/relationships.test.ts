/**
 * Tests for relationship helpers
 */

import { describe, it, expect } from 'bun:test';
import {
	hasMany,
	belongsTo,
	hasOne,
	manyToMany,
	validateRelationship,
} from '../../resource/relationships.js';

describe('relationship helpers', () => {
	describe('hasMany', () => {
		it('should create hasMany relationship', () => {
			const rel = hasMany('step', { foreignKey: 'message_id' });

			expect(rel.type).toBe('hasMany');
			expect(rel.target).toBe('step');
			expect(rel.foreignKey).toBe('message_id');
		});

		it('should support orderBy', () => {
			const rel = hasMany('step', {
				foreignKey: 'message_id',
				orderBy: { stepIndex: 'asc' },
			});

			expect(rel.orderBy).toEqual({ stepIndex: 'asc' });
		});

		it('should support through (for many-to-many)', () => {
			const rel = hasMany('role', {
				foreignKey: 'user_id',
				through: 'user_roles',
			});

			expect(rel.through).toBe('user_roles');
		});
	});

	describe('belongsTo', () => {
		it('should create belongsTo relationship', () => {
			const rel = belongsTo('message', { foreignKey: 'message_id' });

			expect(rel.type).toBe('belongsTo');
			expect(rel.target).toBe('message');
			expect(rel.foreignKey).toBe('message_id');
		});
	});

	describe('hasOne', () => {
		it('should create hasOne relationship', () => {
			const rel = hasOne('profile', { foreignKey: 'user_id' });

			expect(rel.type).toBe('hasOne');
			expect(rel.target).toBe('profile');
			expect(rel.foreignKey).toBe('user_id');
		});
	});

	describe('manyToMany', () => {
		it('should create manyToMany relationship', () => {
			const rel = manyToMany('role', {
				through: 'user_roles',
				foreignKey: 'user_id',
				targetForeignKey: 'role_id',
			});

			expect(rel.type).toBe('manyToMany');
			expect(rel.target).toBe('role');
			expect(rel.through).toBe('user_roles');
			expect(rel.foreignKey).toBe('user_id');
			expect(rel.targetForeignKey).toBe('role_id');
		});
	});

	describe('validateRelationship', () => {
		it('should validate hasMany relationship', () => {
			const rel = hasMany('step', { foreignKey: 'message_id' });

			expect(() => {
				validateRelationship('message', 'steps', rel);
			}).not.toThrow();
		});

		it('should validate belongsTo relationship', () => {
			const rel = belongsTo('message', { foreignKey: 'message_id' });

			expect(() => {
				validateRelationship('step', 'message', rel);
			}).not.toThrow();
		});

		it('should throw if foreignKey is missing', () => {
			const rel = {
				type: 'hasMany',
				target: 'step',
				foreignKey: undefined,
			} as any;

			expect(() => {
				validateRelationship('message', 'steps', rel);
			}).toThrow('missing foreignKey');
		});

		it('should throw if many-to-many missing through', () => {
			const rel = {
				type: 'manyToMany',
				target: 'role',
				foreignKey: 'user_id',
				targetForeignKey: 'role_id',
				through: undefined,
			} as any;

			expect(() => {
				validateRelationship('user', 'roles', rel);
			}).toThrow('missing "through" table');
		});

		it('should throw if many-to-many missing targetForeignKey', () => {
			const rel = {
				type: 'manyToMany',
				target: 'role',
				foreignKey: 'user_id',
				through: 'user_roles',
				targetForeignKey: undefined,
			} as any;

			expect(() => {
				validateRelationship('user', 'roles', rel);
			}).toThrow('missing "targetForeignKey"');
		});

		it('should throw if target resource name is empty', () => {
			const rel = {
				type: 'hasMany',
				target: '',
				foreignKey: 'message_id',
			} as any;

			expect(() => {
				validateRelationship('message', 'steps', rel);
			}).toThrow('invalid target resource name');
		});

		it('should throw if target resource name is whitespace', () => {
			const rel = {
				type: 'hasMany',
				target: '   ',
				foreignKey: 'message_id',
			} as any;

			expect(() => {
				validateRelationship('message', 'steps', rel);
			}).toThrow('invalid target resource name');
		});
	});

	describe('type inference', () => {
		it('should infer target type for hasMany', () => {
			const rel = hasMany('step', { foreignKey: 'message_id' });

			// Type test - should compile without errors
			type Target = typeof rel.target;
			const target: Target = 'step';

			expect(target).toBe('step');
		});

		it('should infer target type for belongsTo', () => {
			const rel = belongsTo('message', { foreignKey: 'message_id' });

			// Type test - should compile without errors
			type Target = typeof rel.target;
			const target: Target = 'message';

			expect(target).toBe('message');
		});
	});

	describe('relationship options', () => {
		it('should preserve all hasMany options', () => {
			const rel = hasMany('step', {
				foreignKey: 'message_id',
				orderBy: { createdAt: 'desc', stepIndex: 'asc' },
				through: 'junction_table',
			});

			expect(rel).toEqual({
				type: 'hasMany',
				target: 'step',
				foreignKey: 'message_id',
				orderBy: { createdAt: 'desc', stepIndex: 'asc' },
				through: 'junction_table',
			});
		});

		it('should handle optional orderBy', () => {
			const rel1 = hasMany('step', { foreignKey: 'message_id' });
			expect(rel1.orderBy).toBeUndefined();

			const rel2 = hasMany('step', {
				foreignKey: 'message_id',
				orderBy: { stepIndex: 'asc' },
			});
			expect(rel2.orderBy).toEqual({ stepIndex: 'asc' });
		});

		it('should handle optional through', () => {
			const rel1 = hasMany('step', { foreignKey: 'message_id' });
			expect(rel1.through).toBeUndefined();

			const rel2 = hasMany('step', {
				foreignKey: 'message_id',
				through: 'junction',
			});
			expect(rel2.through).toBe('junction');
		});
	});
});
