/**
 * Session data parsing and transformation
 * Handles Zod schemas, JSON parsing, and data migration/validation
 */
import { eq, inArray } from "drizzle-orm";
import { MessagePartSchema, StringArraySchema } from "../../schemas/message.schemas.js";
import { logger } from "../../utils/logger.js";
import { messageSteps, messages, sessions, stepParts, stepUsage, todos } from "../schema.js";
/**
 * Parse and validate enabledRuleIds from raw database value
 */
export function parseEnabledRuleIds(raw) {
    if (!raw)
        return [];
    try {
        const parsed = StringArraySchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw);
        return parsed.success ? parsed.data : [];
    }
    catch {
        return [];
    }
}
/**
 * Parse and validate optional string array from raw database value
 */
export function parseOptionalStringArray(raw) {
    if (!raw)
        return null;
    try {
        const parsed = StringArraySchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw);
        return parsed.success ? parsed.data : null;
    }
    catch {
        return null;
    }
}
/**
 * Parse raw session record and fix corrupted data
 */
export async function parseSessionRow(raw, db) {
    try {
        // Parse and validate enabledRuleIds
        let enabledRuleIds = [];
        if (raw.enabled_rule_ids) {
            const parsed = StringArraySchema.safeParse(JSON.parse(raw.enabled_rule_ids));
            if (parsed.success) {
                enabledRuleIds = parsed.data;
            }
            else {
                // Corrupted JSON - default to empty array and fix it
                enabledRuleIds = [];
                await db
                    .update(sessions)
                    .set({ enabledRuleIds: [] })
                    .where(eq(sessions.id, raw.id));
            }
        }
        // Parse and validate toolIds
        let toolIds = null;
        if (raw.tool_ids) {
            const parsed = StringArraySchema.safeParse(JSON.parse(raw.tool_ids));
            if (parsed.success) {
                toolIds = parsed.data;
            }
        }
        // Parse and validate mcpServerIds
        let mcpServerIds = null;
        if (raw.mcp_server_ids) {
            const parsed = StringArraySchema.safeParse(JSON.parse(raw.mcp_server_ids));
            if (parsed.success) {
                mcpServerIds = parsed.data;
            }
        }
        return {
            id: raw.id,
            title: raw.title,
            modelId: raw.model_id,
            provider: raw.provider,
            model: raw.model,
            agentId: raw.agent_id,
            enabledRuleIds,
            toolIds,
            mcpServerIds,
            nextTodoId: raw.next_todo_id,
            created: raw.created,
            updated: raw.updated,
            flags: raw.flags,
            baseContextTokens: raw.base_context_tokens,
            totalTokens: raw.total_tokens,
        };
    }
    catch {
        // Skip this session - too corrupted to parse
        return null;
    }
}
/**
 * Get messages for a session with step-based structure
 * Assembles steps, parts, attachments, usage into SessionMessage format
 * OPTIMIZED: Batch queries instead of N+1 queries
 */
export async function getSessionMessages(db, sessionId) {
    // Get all messages for session
    const messageRecords = await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(messages.ordering);
    if (messageRecords.length === 0) {
        return [];
    }
    // Batch fetch all related data (MASSIVE performance improvement!)
    const messageIds = messageRecords.map((m) => m.id);
    // Get all steps for all messages
    const allSteps = await db
        .select()
        .from(messageSteps)
        .where(inArray(messageSteps.messageId, messageIds))
        .orderBy(messageSteps.stepIndex);
    const stepIds = allSteps.map((s) => s.id);
    // Fetch all step-related data in parallel
    const [allParts, allStepUsage] = await Promise.all([
        // Step parts
        db
            .select()
            .from(stepParts)
            .where(inArray(stepParts.stepId, stepIds))
            .orderBy(stepParts.ordering),
        // Step usage
        db
            .select()
            .from(stepUsage)
            .where(inArray(stepUsage.stepId, stepIds)),
    ]);
    // Group by step ID
    const partsByStep = new Map();
    const usageByStep = new Map();
    for (const part of allParts) {
        if (!partsByStep.has(part.stepId)) {
            partsByStep.set(part.stepId, []);
        }
        partsByStep.get(part.stepId)?.push(part);
    }
    for (const usage of allStepUsage) {
        usageByStep.set(usage.stepId, usage);
    }
    // Group by message ID
    const stepsByMessage = new Map();
    for (const step of allSteps) {
        if (!stepsByMessage.has(step.messageId)) {
            stepsByMessage.set(step.messageId, []);
        }
        stepsByMessage.get(step.messageId)?.push(step);
    }
    // Assemble messages using grouped data
    const fullMessages = messageRecords.map((msg) => {
        const steps = stepsByMessage.get(msg.id) || [];
        // Compute message usage from step usage
        let messageUsage;
        const stepUsages = steps
            .map((s) => usageByStep.get(s.id))
            .filter((u) => u !== undefined);
        if (stepUsages.length > 0) {
            messageUsage = {
                promptTokens: stepUsages.reduce((sum, u) => sum + u.promptTokens, 0),
                completionTokens: stepUsages.reduce((sum, u) => sum + u.completionTokens, 0),
                totalTokens: stepUsages.reduce((sum, u) => sum + u.totalTokens, 0),
            };
        }
        // Build steps
        const messageSteps = steps.map((step) => {
            const parts = partsByStep.get(step.id) || [];
            const stepUsageData = usageByStep.get(step.id);
            // Parse message parts with validation
            const parsedParts = parts.map((p) => {
                const parsed = MessagePartSchema.safeParse(JSON.parse(p.content));
                if (!parsed.success) {
                    // Validation failed - log and return fallback
                    logger.error("Invalid MessagePart", parsed.error);
                    return JSON.parse(p.content);
                }
                return parsed.data;
            });
            const messageStep = {
                id: step.id,
                stepIndex: step.stepIndex,
                parts: parsedParts,
                status: step.status || "completed",
            };
            // Note: metadata field removed from MessageStep - no longer stored per-step
            // System status (cpu, memory) tracking removed for performance
            if (stepUsageData) {
                messageStep.usage = {
                    promptTokens: stepUsageData.promptTokens,
                    completionTokens: stepUsageData.completionTokens,
                    totalTokens: stepUsageData.totalTokens,
                };
            }
            if (step.provider) {
                messageStep.provider = step.provider;
            }
            if (step.model) {
                messageStep.model = step.model;
            }
            if (step.duration) {
                messageStep.duration = step.duration;
            }
            if (step.finishReason) {
                messageStep.finishReason = step.finishReason;
            }
            if (step.startTime) {
                messageStep.startTime = step.startTime;
            }
            if (step.endTime) {
                messageStep.endTime = step.endTime;
            }
            return messageStep;
        });
        const sessionMessage = {
            id: msg.id,
            role: msg.role,
            steps: messageSteps,
            timestamp: msg.timestamp,
            status: msg.status || "completed",
        };
        // Aggregated usage (computed from step usage)
        if (messageUsage) {
            sessionMessage.usage = messageUsage;
        }
        // Final finish reason (from last step or message-level)
        if (msg.finishReason) {
            sessionMessage.finishReason = msg.finishReason;
        }
        return sessionMessage;
    });
    return fullMessages;
}
/**
 * Get todos for a session
 */
export async function getSessionTodos(db, sessionId) {
    const todoRecords = await db
        .select()
        .from(todos)
        .where(eq(todos.sessionId, sessionId))
        .orderBy(todos.ordering);
    return todoRecords.map((t) => ({
        id: t.id,
        content: t.content,
        activeForm: t.activeForm,
        status: t.status,
        ordering: t.ordering,
    }));
}
//# sourceMappingURL=session-parser.js.map