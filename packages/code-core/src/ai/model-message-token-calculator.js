/**
 * Model Message Token Calculator
 * SSOT for calculating tokens of AI SDK ModelMessage format with content-based caching
 *
 * ARCHITECTURE: Content-based caching (NO database cache, NO TTL)
 * - Uses SHA256 content hashing for cache invalidation
 * - Cache key: ${tokenizerName}:${messageHash}
 * - LRU cache with max 1000 entries
 * - Messages are immutable → cache永遠有效
 *
 * CACHING STRATEGY:
 * - Content hash = SHA256(entire message object)
 * - Message unchanged → cache hit (< 1ms)
 * - New message → cache miss, calculate (30ms)
 * - Model switch → different tokenizer → cache miss for that tokenizer
 *
 * PERFORMANCE:
 * - First time with model: Calculate all messages (~3s for 100 messages)
 * - Subsequent calls: All cache hits (~100ms for 100 messages)
 * - New message added: Only calculate new message (30ms)
 * - Model switch: Recalculate all (but can reuse for that model next time)
 */
import { createHash } from "node:crypto";
import { cacheManager } from "../cache/cache-manager.js";
import { LRUCache } from "../utils/lru-cache.js";
import { countTokens, getTokenizerForModel } from "../utils/token-counter.js";
// Message token cache: ${tokenizerName}:${messageHash} → tokens
// Max 1000 entries (individual messages across sessions)
const messageTokenCache = new LRUCache(1000);
// Register with cache manager
cacheManager.register("message-tokens", messageTokenCache, "Model message tokens with SHA256 content-based caching (immutable messages)");
/**
 * Generate content hash for a message
 * Hash entire message object for cache key
 */
function generateMessageHash(message) {
    const messageStr = JSON.stringify(message);
    return createHash("sha256").update(messageStr).digest("hex").slice(0, 16);
}
/**
 * Calculate tokens for AI SDK ModelMessage array
 * With content-based caching for performance
 *
 * @param modelMessages - Messages in AI SDK format (from buildModelMessages)
 * @param modelName - Model name for tokenizer selection
 * @param options - Optional configuration
 * @param options.useAccurate - If false, use fast estimation instead of BPE tokenizer
 * @returns Total tokens for all messages
 */
export async function calculateModelMessagesTokens(modelMessages, modelName, options) {
    const tokenizerName = getTokenizerForModel(modelName);
    let totalTokens = 0;
    let _cacheHits = 0;
    let _cacheMisses = 0;
    for (const message of modelMessages) {
        // Generate cache key
        const messageHash = generateMessageHash(message);
        const cacheKey = `${tokenizerName}:${messageHash}`;
        // Check cache
        const cached = messageTokenCache.get(cacheKey);
        if (cached !== undefined) {
            cacheManager.recordHit("message-tokens");
            totalTokens += cached;
            _cacheHits++;
            continue;
        }
        // Cache miss - calculate
        cacheManager.recordMiss("message-tokens");
        _cacheMisses++;
        const tokens = await calculateModelMessageTokens(message, modelName, options);
        messageTokenCache.set(cacheKey, tokens);
        totalTokens += tokens;
    }
    return totalTokens;
}
/**
 * Clear message token cache
 * Useful for testing or memory management
 */
export function clearMessageTokenCache() {
    messageTokenCache.clear();
}
/**
 * Calculate tokens for a single ModelMessage
 * Handles all content types: text, file, reasoning, tool-call, tool-result
 */
async function calculateModelMessageTokens(message, modelName, options) {
    let tokens = 0;
    // Role overhead (minimal, but include for accuracy)
    // AI SDK includes role in prompt construction
    tokens += await countTokens(message.role, modelName, options);
    // Calculate content tokens based on type
    const content = message.content;
    if (typeof content === "string") {
        // Simple string content
        tokens += await countTokens(content, modelName, options);
    }
    else if (Array.isArray(content)) {
        // Array of content parts
        for (const part of content) {
            tokens += await calculateContentPartTokens(part, modelName, options);
        }
    }
    return tokens;
}
/**
 * Calculate tokens for a content part
 * Handles all AI SDK content part types
 */
async function calculateContentPartTokens(part, modelName, options) {
    switch (part.type) {
        case "text":
            // Text content
            return await countTokens(part.text, modelName, options);
        case "reasoning":
            // Extended thinking (Anthropic)
            return await countTokens(part.text, modelName, options);
        case "file": {
            // File content sent to model
            // part.data can be Buffer or base64 string
            let fileContent;
            if (Buffer.isBuffer(part.data)) {
                // Binary file - try to decode as UTF-8, fallback to size estimation
                try {
                    fileContent = part.data.toString("utf-8");
                }
                catch {
                    // Binary content - estimate tokens by size
                    // Rough estimation: 1 token ≈ 4 bytes for binary
                    return Math.ceil(part.data.length / 4);
                }
            }
            else if (typeof part.data === "string") {
                // Base64 string
                try {
                    const buffer = Buffer.from(part.data, "base64");
                    fileContent = buffer.toString("utf-8");
                }
                catch {
                    // Fallback: count the base64 string itself
                    return await countTokens(part.data, modelName, options);
                }
            }
            else {
                return 0;
            }
            // For text files, count actual tokens
            // Include filename and mediaType in XML wrapper (as sent to model)
            const wrappedContent = `<file path="${part.filename || "file"}" type="${part.mediaType || "unknown"}">\n${fileContent}\n</file>`;
            return await countTokens(wrappedContent, modelName, options);
        }
        case "tool-call": {
            // Tool call - count toolName + input
            let tokens = 0;
            tokens += await countTokens(part.toolName, modelName, options);
            if (part.input) {
                const inputJson = JSON.stringify(part.input);
                tokens += await countTokens(inputJson, modelName, options);
            }
            return tokens;
        }
        case "tool-result": {
            // Tool result - count toolName + output
            let tokens = 0;
            tokens += await countTokens(part.toolName, modelName, options);
            if (part.output) {
                // output is AI SDK wrapped format: { type: 'json', value: ... } or { type: 'text', text: ... }
                const outputJson = JSON.stringify(part.output);
                tokens += await countTokens(outputJson, modelName, options);
            }
            return tokens;
        }
        case "image": {
            // Image content - fixed token cost estimation
            // Conservative estimate: 1500 tokens per image
            // Actual cost varies by model and image size but this provides reasonable approximation
            return 1500;
        }
        default:
            // Unknown part type - log warning and skip
            console.warn(`[calculateContentPartTokens] Unknown part type: ${part.type}`);
            return 0;
    }
}
//# sourceMappingURL=model-message-token-calculator.js.map