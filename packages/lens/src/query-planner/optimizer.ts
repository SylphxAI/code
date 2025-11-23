/**
 * Query Optimizer
 *
 * ARCHITECTURE:
 * - Generates optimal execution plans based on query analysis
 * - Chooses strategy: JOIN vs batched vs lazy
 * - Minimizes database round-trips
 * - Balances memory usage vs query count
 */

import type { ResourceDefinition, SelectionSet } from '../resource/types.js';
import type { QueryAnalysis, RelationshipTraversal } from './analyzer.js';
import { analyzeQuery } from './analyzer.js';
import { ResourceRegistry } from '../resource/registry.js';

/**
 * Execution strategy types
 */
export type ExecutionStrategy = 'join' | 'batch' | 'lazy';

/**
 * Query step type
 */
export type QueryStepType = 'root' | 'relationship' | 'computed';

/**
 * Query execution step
 */
export interface QueryStep {
	/** Step type */
	type: QueryStepType;

	/** Resource name */
	resource: string;

	/** Relationship name (if type = relationship) */
	relationship?: string;

	/** Execution strategy for this step */
	strategy: ExecutionStrategy;

	/** Selection set for this step */
	selection: SelectionSet;

	/** Fields to select from database */
	fields: string[];

	/** Dependencies (step indices that must complete first) */
	dependencies: number[];

	/** Expected cardinality (1 = single, N = multiple) */
	cardinality: 'one' | 'many';

	/** Whether this step can be parallelized */
	parallelizable: boolean;
}

/**
 * Complete execution plan
 */
export interface ExecutionPlan {
	/** Overall strategy */
	strategy: ExecutionStrategy;

	/** Ordered list of query steps */
	steps: QueryStep[];

	/** Estimated number of database queries */
	estimatedQueries: number;

	/** Analysis that generated this plan */
	analysis: QueryAnalysis;

	/** Optimization notes */
	optimizations: string[];
}

/**
 * Generate an optimal execution plan for a query
 *
 * @example
 * ```typescript
 * const plan = generateExecutionPlan(MessageResource.definition, {
 *   id: true,
 *   steps: { select: { parts: true } }
 * });
 * // plan.strategy = 'batch'
 * // plan.estimatedQueries = 3 (root + batched steps + batched parts)
 * ```
 */
export function generateExecutionPlan(
	resource: ResourceDefinition,
	selection: SelectionSet
): ExecutionPlan {
	// Analyze query first
	const analysis = analyzeQuery(resource, selection);

	// Decide overall strategy
	const strategy = decideStrategy(analysis);

	// Generate steps based on strategy
	const steps =
		strategy === 'join'
			? generateJoinSteps(resource, selection, analysis)
			: strategy === 'batch'
				? generateBatchSteps(resource, selection, analysis)
				: generateLazySteps(resource, selection, analysis);

	// Calculate actual estimated queries
	const estimatedQueries = steps.length;

	// Track optimizations applied
	const optimizations: string[] = [];
	if (strategy === 'batch' && analysis.hasNPlusOne) {
		optimizations.push('N+1 queries batched into single queries per relationship');
	}
	if (strategy === 'join' && analysis.depth === 1) {
		optimizations.push('Single JOIN query for shallow relationships');
	}

	return {
		strategy,
		steps,
		estimatedQueries,
		analysis,
		optimizations,
	};
}

/**
 * Decide execution strategy based on query analysis
 *
 * Strategy decision logic:
 * - JOIN: Depth = 1, simple relationships, NO N+1 patterns, <=2 relationships
 * - BATCH: Depth <= 2, <10 relationships, OR has N+1 patterns
 * - LAZY: Deep queries (>=3), many relationships (>=10)
 */
export function decideStrategy(analysis: QueryAnalysis): ExecutionStrategy {
	// Deep or complex query → LAZY (even with N+1, too deep to batch efficiently)
	if (analysis.depth >= 3 || analysis.relationships.length >= 10) {
		return 'lazy';
	}

	// Has N+1 issues and shallow enough → BATCH (to optimize with batching)
	if (analysis.hasNPlusOne) {
		return 'batch';
	}

	// Simple shallow query without N+1 → JOIN
	if (analysis.depth === 1 && analysis.relationships.length <= 2) {
		return 'join';
	}

	// Default: BATCH (optimal for most cases)
	return 'batch';
}

/**
 * Generate JOIN-based execution plan
 * Single query with SQL JOINs for all relationships
 */
function generateJoinSteps(
	resource: ResourceDefinition,
	selection: SelectionSet,
	analysis: QueryAnalysis
): QueryStep[] {
	const fields = extractFields(selection);

	// Single step with JOIN strategy
	const step: QueryStep = {
		type: 'root',
		resource: resource.name,
		strategy: 'join',
		selection,
		fields,
		dependencies: [],
		cardinality: 'many',
		parallelizable: false,
	};

	return [step];
}

/**
 * Generate BATCH-based execution plan
 * Multiple queries with batching to avoid N+1
 */
function generateBatchSteps(
	resource: ResourceDefinition,
	selection: SelectionSet,
	analysis: QueryAnalysis
): QueryStep[] {
	const steps: QueryStep[] = [];
	const stepIndexMap = new Map<string, number>();

	// Root query step
	const rootFields = extractFields(selection);
	const rootStep: QueryStep = {
		type: 'root',
		resource: resource.name,
		strategy: 'batch',
		selection: filterNonRelationships(selection),
		fields: rootFields,
		dependencies: [],
		cardinality: 'many',
		parallelizable: false,
	};
	steps.push(rootStep);
	stepIndexMap.set(resource.name, 0);

	// Generate steps for each relationship traversal
	for (const traversal of analysis.traversalTree) {
		generateBatchStepsForTraversal(
			traversal,
			steps,
			stepIndexMap,
			[0] // Root step dependency
		);
	}

	return steps;
}

/**
 * Recursively generate batch steps for relationship traversal
 */
function generateBatchStepsForTraversal(
	traversal: RelationshipTraversal,
	steps: QueryStep[],
	stepIndexMap: Map<string, number>,
	dependencies: number[]
): void {
	const targetResource = ResourceRegistry.get(traversal.target);
	if (!targetResource) {
		return;
	}

	// Create step for this relationship
	const stepIndex = steps.length;
	const step: QueryStep = {
		type: 'relationship',
		resource: traversal.target,
		relationship: traversal.name,
		strategy: 'batch',
		selection: {}, // Will be filled from children
		fields: [], // Will be filled from children
		dependencies,
		cardinality: traversal.type === 'hasMany' ? 'many' : 'one',
		parallelizable: dependencies.length === 1, // Can parallelize if only depends on root
	};

	steps.push(step);
	stepIndexMap.set(`${traversal.name}:${traversal.target}`, stepIndex);

	// Recurse into children
	for (const child of traversal.children) {
		generateBatchStepsForTraversal(child, steps, stepIndexMap, [stepIndex]);
	}
}

/**
 * Generate LAZY-based execution plan
 * On-demand loading as data is accessed
 */
function generateLazySteps(
	resource: ResourceDefinition,
	selection: SelectionSet,
	analysis: QueryAnalysis
): QueryStep[] {
	// For lazy loading, we only generate the root step
	// Relationships are loaded on-demand
	const fields = extractFields(selection);

	const step: QueryStep = {
		type: 'root',
		resource: resource.name,
		strategy: 'lazy',
		selection: filterNonRelationships(selection),
		fields,
		dependencies: [],
		cardinality: 'many',
		parallelizable: false,
	};

	return [step];
}

/**
 * Extract field names from selection set
 */
function extractFields(selection: SelectionSet): string[] {
	const fields: string[] = [];

	for (const [key, value] of Object.entries(selection)) {
		if (value === true) {
			fields.push(key);
		} else if (typeof value === 'object' && value !== null) {
			// For relationships, we'll handle separately
			// Just include the field name for now
			fields.push(key);
		}
	}

	return fields;
}

/**
 * Filter out relationships from selection set
 * Returns only scalar fields
 */
function filterNonRelationships(selection: SelectionSet): SelectionSet {
	const filtered: SelectionSet = {};

	for (const [key, value] of Object.entries(selection)) {
		// Only include if it's a simple boolean selection
		// (relationships have nested select objects)
		if (value === true) {
			filtered[key] = true;
		}
	}

	return filtered;
}

/**
 * Describe execution plan in human-readable format
 */
export function describePlan(plan: ExecutionPlan): string {
	const lines: string[] = [];

	lines.push(`Execution Plan (${plan.strategy.toUpperCase()} strategy):`);
	lines.push(`  Steps: ${plan.steps.length}`);
	lines.push(`  Estimated queries: ${plan.estimatedQueries}`);

	if (plan.optimizations.length > 0) {
		lines.push(`\nOptimizations:`);
		for (const opt of plan.optimizations) {
			lines.push(`  ✓ ${opt}`);
		}
	}

	lines.push(`\nExecution steps:`);
	for (let i = 0; i < plan.steps.length; i++) {
		const step = plan.steps[i];
		const parallel = step.parallelizable ? ' [parallel]' : '';
		const deps =
			step.dependencies.length > 0
				? ` (depends on: ${step.dependencies.join(', ')})`
				: '';

		lines.push(
			`  ${i}. ${step.type} → ${step.resource}${step.relationship ? `.${step.relationship}` : ''} [${step.strategy}]${parallel}${deps}`
		);
	}

	return lines.join('\n');
}
