/**
 * Lens Query Planner
 *
 * Analyzes queries, detects N+1 patterns, and generates optimal execution plans
 *
 * @example
 * ```typescript
 * import { analyzeQuery, generateExecutionPlan, executeQuery } from '@sylphx/lens/query-planner';
 *
 * // Analyze query
 * const analysis = analyzeQuery(MessageResource.definition, {
 *   id: true,
 *   steps: { select: { parts: true } }
 * });
 *
 * // Generate execution plan
 * const plan = generateExecutionPlan(MessageResource.definition, selection);
 *
 * // Execute plan
 * const result = await executeQuery(plan, context);
 * ```
 */

// Analyzer
export {
	analyzeQuery,
	calculateComplexity,
	describeAnalysis,
} from './analyzer.js';

export type {
	QueryAnalysis,
	RelationshipTraversal,
} from './analyzer.js';

// Optimizer
export {
	generateExecutionPlan,
	decideStrategy,
	describePlan,
} from './optimizer.js';

export type {
	ExecutionStrategy,
	QueryStepType,
	QueryStep,
	ExecutionPlan,
} from './optimizer.js';

// Executor
export {
	executeQuery,
	executeQueryParallel,
	getExecutionStats,
} from './executor.js';

export type {
	StepResult,
	ExecutionResult,
} from './executor.js';
