/**
 * System Message Helpers
 * Creates system role messages for dynamic LLM hints
 *
 * Architecture:
 * - System messages are stored as 'system' role in database
 * - Converted to 'user' role when building model messages (attention decay prevention)
 * - Wrapped in <system_message> tags for LLM recognition
 * - Triggered by various conditions (context usage, resources, todos)
 *
 * Use Cases:
 * 1. Context usage warnings (80%, 90% thresholds)
 * 2. Session start todo hints
 * 3. System resource warnings (CPU, Memory > 80%)
 */

/**
 * System message types
 */
export type SystemMessageType =
  | 'context-warning-80'
  | 'context-warning-90'
  | 'session-start-todos'
  | 'resource-warning-cpu'
  | 'resource-warning-memory';

/**
 * System message content builders
 */
export const SystemMessages = {
  /**
   * Context usage warning at 80%
   * Triggered once when context usage exceeds 80%
   */
  contextWarning80(): string {
    return `<system_message type="context-warning">
⚠️ Context Usage Warning

Current context usage: >80% (less than 20% remaining)

The conversation context is approaching the limit. Please be aware that:
- Complex responses may be truncated
- Consider wrapping up current tasks
- Prepare for potential context summarization

When context reaches 90%, the conversation will be automatically summarized and moved to a new session.
</system_message>`;
  },

  /**
   * Context usage critical at 90%
   * Triggered once when context usage exceeds 90%
   */
  contextWarning90(): string {
    return `<system_message type="context-critical">
🚨 Context Usage Critical

Current context usage: >90% (less than 10% remaining)

The conversation will be summarized and moved to a new session soon. Please:
1. Complete current in-progress tasks
2. Provide clear status updates
3. Document any important context that should be carried over
4. Prepare for context handoff

The summary will preserve:
- Current todos and their status
- Key decisions and outcomes
- Important context for continuation
</system_message>`;
  },

  /**
   * Session start with existing todos
   * Triggered at first user message in new session
   */
  sessionStartWithTodos(todos: Array<{ content: string; status: string }>): string {
    const todoList = todos
      .map((todo, idx) => `${idx + 1}. [${todo.status}] ${todo.content}`)
      .join('\n');

    return `<system_message type="session-start-todos">
📋 Session Started - Active Tasks

You have ${todos.length} active todo(s):

${todoList}

Please continue working on these tasks. Use the TodoWrite tool to update task status as you make progress.
</system_message>`;
  },

  /**
   * Session start without todos (reminder)
   * Triggered at first user message in new session with no todos
   */
  sessionStartNoTodos(): string {
    return `<system_message type="session-start-reminder">
📋 Session Started

No active todos found.

Remember: For multi-step tasks or complex requests, always use the TodoWrite tool to:
- Track progress across multiple steps
- Ensure nothing is forgotten
- Provide clear status updates to the user

Example usage:
\`\`\`typescript
TodoWrite({
  todos: [
    { content: "Analyze requirements", status: "completed", activeForm: "Analyzing requirements" },
    { content: "Implement feature", status: "in_progress", activeForm: "Implementing feature" },
    { content: "Write tests", status: "pending", activeForm: "Writing tests" }
  ]
})
\`\`\`
</system_message>`;
  },

  /**
   * CPU usage warning
   * Triggered when CPU usage exceeds 80%
   */
  resourceWarningCPU(usage: string): string {
    return `<system_message type="resource-warning-cpu">
⚠️ System Resource Warning - CPU

Current CPU usage: ${usage}

CPU resources are constrained. Please:
- Avoid spawning multiple parallel processes
- Consider breaking large operations into smaller chunks
- Be mindful of computationally intensive operations
- Monitor for performance degradation

This is a temporary condition and should resolve as background tasks complete.
</system_message>`;
  },

  /**
   * Memory usage warning
   * Triggered when memory usage exceeds 80%
   */
  resourceWarningMemory(usage: string): string {
    return `<system_message type="resource-warning-memory">
⚠️ System Resource Warning - Memory

Current memory usage: ${usage}

Memory resources are constrained. Please:
- Avoid loading large files into memory
- Use streaming approaches where possible
- Clean up temporary data when done
- Be cautious with in-memory data structures

This is a temporary condition and should resolve as tasks complete.
</system_message>`;
  },
};

/**
 * Helper to create system message content
 * Wraps content in <system_message> tags
 *
 * @deprecated Use SystemMessages builders instead
 */
export function createSystemMessage(type: string, content: string): string {
  return `<system_message type="${type}">\n${content}\n</system_message>`;
}

/**
 * Parse system message to extract type
 * Used for deduplication (ensure each type only appears once)
 */
export function parseSystemMessageType(content: string): string | null {
  const match = content.match(/<system_message type="([^"]+)">/);
  return match ? match[1] : null;
}

/**
 * Check if message is a system message
 */
export function isSystemMessage(content: string): boolean {
  return content.includes('<system_message');
}
