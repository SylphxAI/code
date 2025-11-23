/**
 * Query Depth Analyzer
 *
 * ARCHITECTURE:
 * - Analyzes query selection sets to determine depth
 * - Detects N+1 query patterns
 * - Counts expected database queries
 * - Identifies relationship traversals
 */

import type { ResourceDefinition, SelectionSet, Relationship } from '../resource/types.js';
import { ResourceRegistry } from '../resource/registry.js';

/**
 * Query analysis result
 */
export interface QueryAnalysis {
	/** Maximum depth of nested relationships */
	depth: number;

	/** List of relationship names traversed */
	relationships: string[];

	/** Estimated number of database queries (without optimization) */
	estimatedQueries: number;

	/** Whether this query has potential N+1 issues */
	hasNPlusOne: boolean;

	/** Relationship traversal tree */
	traversalTree: RelationshipTraversal[];

	/** Total number of relationships at each depth level */
	relationshipsByDepth: Map<number, number>;
}

/**
 * Relationship traversal node
 */
export interface RelationshipTraversal {
	/** Relationship name */
	name: string;

	/** Relationship type */
	type: 'hasMany' | 'belongsTo' | 'hasOne' | 'manyToMany';

	/** Target resource name */
	target: string;

	/** Depth level (1-indexed) */
	depth: number;

	/** Nested traversals */
	children: RelationshipTraversal[];

	/** Whether this causes N+1 */
	causesNPlusOne: boolean;
}

/**
 * Analyze a query selection set to detect depth and N+1 patterns
 *
 * @example
 * ```typescript
 * const analysis = analyzeQuery(MessageResource.definition, {
 *   id: true,
 *   steps: {
 *     select: {
 *       parts: { select: { content: true } }
 *     }
 *   }
 * });
 * // analysis.depth = 2
 * // analysis.hasNPlusOne = true
 * // analysis.estimatedQueries = 1 + N + N*M (without batching)
 * ```
 */
export function analyzeQuery(
	resource: ResourceDefinition,
	selection: SelectionSet
): QueryAnalysis {
	const relationships: string[] = [];
	const traversalTree: RelationshipTraversal[] = [];
	const relationshipsByDepth = new Map<number, number>();
	let maxDepth = 0;
	let totalRelationships = 0;

	/**
	 * Recursively traverse selection set
	 */
	function traverse(
		currentResource: ResourceDefinition,
		currentSelection: SelectionSet,
		currentDepth: number,
		parentType?: 'hasMany' | 'hasOne' | 'belongsTo' | 'manyToMany'
	): RelationshipTraversal[] {
		const traversals: RelationshipTraversal[] = [];

		for (const [key, value] of Object.entries(currentSelection)) {
			// Skip if not a relationship
			const relationship = currentResource.relationships?.[key];
			if (!relationship) {
				continue;
			}

			// Track this relationship
			relationships.push(key);
			totalRelationships++;

			// Update depth tracking
			maxDepth = Math.max(maxDepth, currentDepth);
			relationshipsByDepth.set(
				currentDepth,
				(relationshipsByDepth.get(currentDepth) || 0) + 1
			);

			// Determine if this causes N+1
			// hasMany after hasMany = N+1
			// hasMany after root = N+1 (but can be batched)
			const causesNPlusOne =
				relationship.type === 'hasMany' &&
				(parentType === 'hasMany' || currentDepth === 1);

			// Get target resource
			const targetResource = ResourceRegistry.get(relationship.target);
			if (!targetResource) {
				console.warn(
					`Analyzer: relationship "${key}" references undefined resource "${relationship.target}"`
				);
				continue;
			}

			// Recurse into nested selections
			const children: RelationshipTraversal[] = [];
			if (typeof value === 'object' && value !== null && 'select' in value) {
				children.push(
					...traverse(
						targetResource,
						value.select as SelectionSet,
						currentDepth + 1,
						relationship.type
					)
				);
			}

			// Create traversal node
			const traversal: RelationshipTraversal = {
				name: key,
				type: relationship.type,
				target: relationship.target,
				depth: currentDepth,
				children,
				causesNPlusOne,
			};

			traversals.push(traversal);
		}

		return traversals;
	}

	// Start traversal from root
	const rootTraversals = traverse(resource, selection, 1);
	traversalTree.push(...rootTraversals);

	// Calculate estimated queries (without optimization)
	// Formula: 1 (root) + sum(N^depth for each hasMany at each depth)
	// Simplified: 1 + totalRelationships (worst case)
	const estimatedQueries = 1 + totalRelationships;

	// Check if any hasMany relationships exist (potential N+1)
	const hasNPlusOne = traversalTree.some((t) => hasNPlusOnePattern(t));

	return {
		depth: maxDepth,
		relationships,
		estimatedQueries,
		hasNPlusOne,
		traversalTree,
		relationshipsByDepth,
	};
}

/**
 * Check if a traversal tree has N+1 patterns
 */
function hasNPlusOnePattern(traversal: RelationshipTraversal): boolean {
	// hasMany causes N+1
	if (traversal.causesNPlusOne) {
		return true;
	}

	// Check children recursively
	return traversal.children.some((child) => hasNPlusOnePattern(child));
}

/**
 * Calculate complexity score for a query
 * Higher score = more complex query
 *
 * Score factors:
 * - Depth: exponential growth
 * - Number of relationships: linear
 * - hasMany multiplier: 2x
 */
export function calculateComplexity(analysis: QueryAnalysis): number {
	let score = 0;

	// Depth score: 2^depth (exponential)
	score += Math.pow(2, analysis.depth);

	// Relationship count score
	score += analysis.relationships.length * 5;

	// hasMany penalty
	const hasManyCount = countHasManyRelationships(analysis.traversalTree);
	score += hasManyCount * 10;

	return score;
}

/**
 * Count hasMany relationships in traversal tree
 */
function countHasManyRelationships(traversals: RelationshipTraversal[]): number {
	let count = 0;

	for (const traversal of traversals) {
		if (traversal.type === 'hasMany') {
			count++;
		}
		count += countHasManyRelationships(traversal.children);
	}

	return count;
}

/**
 * Get a human-readable description of the query analysis
 */
export function describeAnalysis(analysis: QueryAnalysis): string {
	const lines: string[] = [];

	lines.push(`Query Analysis:`);
	lines.push(`  Depth: ${analysis.depth}`);
	lines.push(`  Relationships: ${analysis.relationships.length}`);
	lines.push(`  Estimated queries (unoptimized): ${analysis.estimatedQueries}`);
	lines.push(`  Has N+1 issues: ${analysis.hasNPlusOne ? 'YES ⚠️' : 'NO ✅'}`);
	lines.push(`  Complexity score: ${calculateComplexity(analysis)}`);

	if (analysis.traversalTree.length > 0) {
		lines.push(`\nTraversal tree:`);
		for (const traversal of analysis.traversalTree) {
			lines.push(...describeTraversal(traversal, 1));
		}
	}

	return lines.join('\n');
}

/**
 * Describe a relationship traversal recursively
 */
function describeTraversal(
	traversal: RelationshipTraversal,
	indentLevel: number
): string[] {
	const indent = '  '.repeat(indentLevel);
	const lines: string[] = [];

	const warning = traversal.causesNPlusOne ? ' ⚠️ N+1' : '';
	lines.push(
		`${indent}→ ${traversal.name} (${traversal.type} → ${traversal.target})${warning}`
	);

	for (const child of traversal.children) {
		lines.push(...describeTraversal(child, indentLevel + 1));
	}

	return lines;
}
