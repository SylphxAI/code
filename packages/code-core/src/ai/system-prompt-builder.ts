/**
 * System Prompt Builder
 * Pure function to build complete system prompt from agent + rules
 * NO global state - explicit parameters only
 */

import type { Agent, Rule } from "../types/index.js";
import { DEFAULT_AGENT_ID } from "./builtin-agents.js";

/**
 * Inline Actions System Prompt
 * Instructions for AI to use streaming XML tags
 */
const INLINE_ACTIONS_PROMPT = `
## Response Format

Structure your response using these tags:

### Main Content
<message>
Your response content here. Use markdown formatting as normal.
</message>

### Session Title
<title>Short, descriptive title</title>
- ALWAYS include on your first response to set the session title
- Update when conversation topic shifts significantly
- Keep titles concise (3-7 words)
- Examples: "React Auth Setup", "Debug API Error", "Python Script Help"

### Suggestions
<suggestions>
<s>Suggested action 1</s>
<s>Suggested action 2</s>
</suggestions>
- Provide 2-4 actionable next steps the user might want to take
- Keep each suggestion brief (under 8 words)
- Include on most responses to guide the conversation

### Rules
- <message> is REQUIRED for every response
- <title> is REQUIRED on your first response, optional after
- <suggestions> should be included when there are clear next actions
- Tags can appear in any order
`;

/**
 * Build complete system prompt from agent definition and enabled rules
 * Pure function - accepts all dependencies explicitly
 *
 * @param agentId - ID of the agent to use
 * @param agents - All available agents
 * @param enabledRules - List of enabled rules
 * @param options - Additional options
 * @returns Combined system prompt (agent + rules + inline actions)
 */
export function buildSystemPrompt(
	agentId: string,
	agents: Agent[],
	enabledRules: Rule[],
	options: { enableInlineActions?: boolean } = {},
): string {
	// Find agent by ID (fallback to default if not found)
	const agent =
		agents.find((a) => a.id === agentId) || agents.find((a) => a.id === DEFAULT_AGENT_ID);

	if (!agent) {
		return "You are a helpful coding assistant.";
	}

	// Start with agent prompt
	let prompt = agent.systemPrompt;

	// Add inline actions instructions if enabled
	if (options.enableInlineActions) {
		prompt = `${prompt}\n\n---\n${INLINE_ACTIONS_PROMPT}`;
	}

	// Combine enabled rules content
	const rulesContent = enabledRules.map((r) => r.content).join("\n\n---\n\n");

	// Add rules if any
	if (rulesContent) {
		prompt = `${prompt}\n\n---\n\n${rulesContent}`;
	}

	return prompt;
}
