/**
 * Built-in System Message Triggers
 * Pre-configured triggers for common scenarios
 */

import { SystemMessages } from "./index.js";
import type { TriggerHook } from "./registry.js";
import { isFlagSet, triggerRegistry } from "./registry.js";

/**
 * Context Warning Thresholds
 */
const CONTEXT_WARNING_80 = 0.8;
const CONTEXT_WARNING_90 = 0.9;

/**
 * Context 80% Warning Trigger
 * Fires once when context usage exceeds 80%
 */
const context80Trigger: TriggerHook = async (context) => {
	const { session, contextTokens } = context;

	if (!contextTokens) {
		return null;
	}

	const usage = contextTokens.current / contextTokens.max;
	const isWarningShown = isFlagSet(session, "contextWarning80");

	// Only fire once when crossing threshold
	if (usage >= CONTEXT_WARNING_80 && !isWarningShown) {
		return {
			messageType: "context-warning-80",
			message: SystemMessages.contextWarning80(),
			flagUpdates: { contextWarning80: true },
		};
	}

	return null;
};

/**
 * Context 90% Critical Trigger
 * Fires once when context usage exceeds 90%
 */
const context90Trigger: TriggerHook = async (context) => {
	const { session, contextTokens } = context;

	if (!contextTokens) {
		return null;
	}

	const usage = contextTokens.current / contextTokens.max;
	const isWarningShown = isFlagSet(session, "contextWarning90");

	// Only fire once when crossing threshold
	if (usage >= CONTEXT_WARNING_90 && !isWarningShown) {
		return {
			messageType: "context-warning-90",
			message: SystemMessages.contextWarning90(),
			flagUpdates: { contextWarning90: true },
		};
	}

	return null;
};

/**
 * Session Start Todo Trigger
 * Fires on first user message to show todo hints
 */
const sessionStartTodoTrigger: TriggerHook = async (context) => {
	const { session } = context;

	// Only check on first user message
	const userMessageCount = session.messages.filter((m) => m.role === "user").length;
	if (userMessageCount !== 0) {
		return null;
	}

	// Check if already shown
	const isShown = isFlagSet(session, "sessionStartTodoShown");
	if (isShown) {
		return null;
	}

	// Show todos or reminder
	const message =
		session.todos && session.todos.length > 0
			? SystemMessages.sessionStartWithTodos(session.todos)
			: SystemMessages.sessionStartNoTodos();

	return {
		messageType: "session-start-todos",
		message,
		flagUpdates: { sessionStartTodoShown: true },
	};
};

/**
 * Random Test Trigger - For UI testing only
 * Randomly triggers to show system messages in UI
 *
 * 50% chance to trigger on each step
 */
const randomTestTrigger: TriggerHook = async (_context) => {
	const randomValue = Math.random();

	// 50% chance to trigger
	if (randomValue > 0.5) {
		return null;
	}

	// Randomly choose message type
	const random = Math.random();

	if (random < 0.33) {
		return {
			messageType: "test-context-warning",
			message: `<system_message type="test-context-warning">
🧪 UI Test: Context Warning

This is a random test message to verify UI display.
Simulated context: ${Math.floor(Math.random() * 30 + 50)}%
</system_message>`,
			flagUpdates: {},
		};
	} else if (random < 0.66) {
		return {
			messageType: "test-memory-warning",
			message: `<system_message type="test-memory-warning">
🧪 UI Test: Memory Warning

This is a random test message to verify UI display.
Simulated memory: ${(Math.random() * 4 + 10).toFixed(1)}GB / 16.0GB
</system_message>`,
			flagUpdates: {},
		};
	} else {
		return {
			messageType: "test-multiple-warnings",
			message: `<system_message type="test-multiple-warnings">
🧪 UI Test: Multiple Warnings

This tests how UI handles multiple warnings:
- Context: ${Math.floor(Math.random() * 20 + 60)}%
- Memory: ${(Math.random() * 3 + 11).toFixed(1)}GB / 16.0GB
</system_message>`,
			flagUpdates: {},
		};
	}
};

/**
 * Register all built-in triggers
 */
export function registerBuiltinTriggers(): void {
	// Priority order (lower = higher priority)

	// Random test trigger (only in TEST_MODE)
	if (process.env.TEST_MODE) {
		triggerRegistry.register({
			id: "random-test-trigger",
			name: "Random Test System Message",
			description: "Random trigger for UI testing (50% chance)",
			priority: -1, // Highest priority
			enabled: true,
			hook: randomTestTrigger,
		});
	}

	triggerRegistry.register({
		id: "context-90-critical",
		name: "Context 90% Critical",
		description: "Warns when context usage exceeds 90%",
		priority: 0, // Highest priority
		enabled: true,
		hook: context90Trigger,
	});

	triggerRegistry.register({
		id: "context-80-warning",
		name: "Context 80% Warning",
		description: "Warns when context usage exceeds 80%",
		priority: 1,
		enabled: true,
		hook: context80Trigger,
	});

	triggerRegistry.register({
		id: "session-start-todos",
		name: "Session Start Todo Hints",
		description: "Shows todo hints on session start",
		priority: 2,
		enabled: true,
		hook: sessionStartTodoTrigger,
	});
}
