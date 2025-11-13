/**
 * Session Token Calculator
 * Calculates base context tokens (system prompt + tools) with content-based caching
 *
 * ARCHITECTURE: Content-based caching (NO database cache, NO TTL)
 * - Uses SHA256 content hashing for cache invalidation
 * - Cache key: ${tokenizerName}:${contentHash}
 * - LRU cache with max 100 entries
 * - Automatic invalidation when content changes
 *
 * CACHING STRATEGY:
 * - Content hash = SHA256(agent + rules + tools)
 * - Content unchanged → cache hit (< 1ms)
 * - Content changed → cache miss, recalculate (700ms)
 * - No TTL needed - content hash provides perfect invalidation
 *
 * WHY CONTENT-BASED?
 * - Agent file edited → hash changes → cache miss → recalculate ✅
 * - Rules toggled → hash changes → cache miss → recalculate ✅
 * - Tools updated → hash changes → cache miss → recalculate ✅
 * - Nothing changed → hash same → cache hit → instant ✅
 */

import { createHash } from "node:crypto";
import { countTokens, getTokenizerForModel } from "../utils/token-counter.js";
import { buildSystemPrompt } from "./system-prompt-builder.js";
import { loadAllAgents } from "./agent-loader.js";
import { loadAllRules } from "./rule-loader.js";
import { getAISDKTools } from "../tools/registry.js";
import { LRUCache } from "../utils/lru-cache.js";
import { cacheManager } from "../cache/cache-manager.js";

// Base context cache: ${tokenizerName}:${contentHash} → tokens
// Max 100 entries (different model/agent/rules combinations)
const baseContextCache = new LRUCache<string, number>(100);

// Register with cache manager
cacheManager.register(
	"base-context",
	baseContextCache,
	"Base context tokens (system prompt + tools) with SHA256 content-based caching",
);

/**
 * Generate content hash for base context caching
 * Hash includes all content that affects token count
 */
function generateBaseContextHash(
	agentId: string,
	allAgents: any[],
	enabledRules: any[],
	tools: Record<string, any>,
): string {
	// 1. Agent content
	const agent = allAgents.find((a) => a.id === agentId);
	const agentContent = agent ? JSON.stringify(agent) : "";

	// 2. Rules content (sorted for consistency)
	const rulesContent = enabledRules
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((r) => JSON.stringify(r))
		.join("|");

	// 3. Tools definition (sorted for consistency)
	const toolsContent = Object.keys(tools)
		.sort()
		.map((k) => JSON.stringify({ name: k, def: tools[k] }))
		.join("|");

	// 4. Combined hash
	const combined = `${agentContent}|${rulesContent}|${toolsContent}`;
	return createHash("sha256").update(combined).digest("hex").slice(0, 16);
}

/**
 * Calculate base context tokens (system prompt + tools)
 * With content-based caching for performance
 *
 * @param modelName Model name for tokenizer selection
 * @param agentId Agent ID for system prompt
 * @param enabledRuleIds Rule IDs for system prompt
 * @param cwd Current working directory
 * @param options Optional configuration
 * @param options.useAccurate If false, use fast estimation instead of BPE tokenizer
 */
export async function calculateBaseContextTokens(
	modelName: string,
	agentId: string,
	enabledRuleIds: string[],
	cwd: string,
	options?: { useAccurate?: boolean },
): Promise<number> {
	// Load agent and rules
	const allAgents = await loadAllAgents(cwd);
	const allRules = await loadAllRules(cwd);
	const enabledRules = allRules.filter((rule) => enabledRuleIds.includes(rule.id));
	const tools = getAISDKTools();

	// Generate content hash for cache key
	const contentHash = generateBaseContextHash(agentId, allAgents, enabledRules, tools);
	const tokenizerName = getTokenizerForModel(modelName);
	const cacheKey = `${tokenizerName}:${contentHash}`;

	// Check cache
	const cached = baseContextCache.get(cacheKey);
	if (cached !== undefined) {
		cacheManager.recordHit("base-context");
		console.log(`[BaseContextCache HIT] ${cacheKey.slice(0, 32)}... → ${cached} tokens`);
		return cached;
	}

	cacheManager.recordMiss("base-context");
	console.log(`[BaseContextCache MISS] ${cacheKey.slice(0, 32)}... (calculating...)`);

	// Build system prompt
	const systemPrompt = buildSystemPrompt(agentId, allAgents, enabledRules);
	const systemPromptTokens = await countTokens(systemPrompt, modelName, options);

	// Calculate tools tokens
	let toolsTokens = 0;

	for (const [toolName, toolDef] of Object.entries(tools)) {
		const toolRepresentation = {
			name: toolName,
			description: toolDef.description || "",
			parameters: toolDef.parameters || {},
		};
		const toolJson = JSON.stringify(toolRepresentation, null, 0);
		const tokens = await countTokens(toolJson, modelName, options);
		toolsTokens += tokens;
	}

	const totalTokens = systemPromptTokens + toolsTokens;

	// Cache result
	baseContextCache.set(cacheKey, totalTokens);
	console.log(`[BaseContextCache CACHED] ${cacheKey.slice(0, 32)}... → ${totalTokens} tokens`);

	return totalTokens;
}

/**
 * Clear base context cache
 * Useful for testing or when you know content changed
 */
export function clearBaseContextCache(): void {
	baseContextCache.clear();
}

