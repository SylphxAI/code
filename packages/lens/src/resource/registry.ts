/**
 * Resource Registry
 *
 * ARCHITECTURE:
 * - Central registry for all resource definitions
 * - Validates relationships at registration
 * - Provides resource lookup
 * - Thread-safe singleton pattern
 */

import type { ResourceDefinition } from './types.js';

/**
 * Resource Registry Implementation
 * Stores all registered resources and validates relationships
 */
class ResourceRegistryImpl {
	private resources = new Map<string, ResourceDefinition>();

	/**
	 * Register a resource definition
	 * @throws Error if resource name already registered
	 */
	register<T extends ResourceDefinition>(definition: T): void {
		// Validate no duplicate names
		if (this.resources.has(definition.name)) {
			throw new Error(`Resource "${definition.name}" already registered`);
		}

		// Validate resource name is not empty
		if (!definition.name || definition.name.trim() === '') {
			throw new Error('Resource name cannot be empty');
		}

		// Validate fields schema exists
		if (!definition.fields) {
			throw new Error(`Resource "${definition.name}" missing fields schema`);
		}

		// Store definition
		this.resources.set(definition.name, definition);

		// Validate relationships after registration
		this.validateRelationships(definition);
	}

	/**
	 * Get a resource definition by name
	 */
	get<TName extends string>(name: TName): ResourceDefinition | undefined {
		return this.resources.get(name);
	}

	/**
	 * Get all registered resource names
	 */
	list(): string[] {
		return Array.from(this.resources.keys());
	}

	/**
	 * Check if a resource is registered
	 */
	has(name: string): boolean {
		return this.resources.has(name);
	}

	/**
	 * Clear all registered resources (for testing)
	 */
	clear(): void {
		this.resources.clear();
	}

	/**
	 * Validate all relationships in a resource definition
	 * Warns if relationship target doesn't exist yet (lazy validation)
	 */
	private validateRelationships(definition: ResourceDefinition): void {
		if (!definition.relationships) {
			return;
		}

		for (const [key, relationship] of Object.entries(definition.relationships)) {
			// Validate relationship has required fields
			if (!relationship.type) {
				throw new Error(
					`Resource "${definition.name}" relationship "${key}" missing type`
				);
			}

			if (!relationship.target) {
				throw new Error(
					`Resource "${definition.name}" relationship "${key}" missing target`
				);
			}

			// Warn if target resource not registered yet
			// (Allows forward references - resources can be registered in any order)
			const target = this.resources.get(relationship.target);
			if (!target) {
				console.warn(
					`Resource "${definition.name}" has relationship "${key}" ` +
						`to undefined resource "${relationship.target}". ` +
						`Make sure to register "${relationship.target}" before using this relationship.`
				);
			}
		}
	}

	/**
	 * Validate all relationships across all resources
	 * Call this after all resources are registered to ensure all targets exist
	 */
	validateAllRelationships(): void {
		const errors: string[] = [];

		for (const definition of this.resources.values()) {
			if (!definition.relationships) {
				continue;
			}

			for (const [key, relationship] of Object.entries(definition.relationships)) {
				const target = this.resources.get(relationship.target);
				if (!target) {
					errors.push(
						`Resource "${definition.name}" relationship "${key}" ` +
							`references undefined resource "${relationship.target}"`
					);
				}
			}
		}

		if (errors.length > 0) {
			throw new Error(
				`Registry validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
			);
		}
	}
}

/**
 * Global resource registry singleton
 * Use this to register and access all resource definitions
 */
export const ResourceRegistry = new ResourceRegistryImpl();
