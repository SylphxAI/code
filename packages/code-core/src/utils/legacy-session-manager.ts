/**
 * Legacy Session Manager (File-Based Sessions)
 *
 * @deprecated This module is kept for backward compatibility with headless mode only.
 *
 * For new development, use:
 * - Database Sessions: code-core/src/database/session-repository.ts
 * - AppContext Services: code-server/src/context.ts
 *
 * Legacy file-based sessions stored in: ~/.sylphx/sessions/
 * Main database sessions stored in: SQLite database
 *
 * Migration Guide:
 * 1. File sessions are simple: { id, provider, model, messages[], todos[], created, updated }
 * 2. Database sessions support: multi-step messages, file references, system messages, metadata
 * 3. To migrate: Load file session, create database session via SessionRepository
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { ProviderId } from "../config/ai-config.js";
import type { Session } from "../types/session.types.js";

export type { Session } from "../types/session.types.js";

/**
 * Zod schema for validating session data from disk
 * Handles both current and legacy formats with migration
 */
const MessagePartSchema = z.union([
	z.object({
		type: z.literal("text"),
		text: z.string(),
	}),
	z.object({
		type: z.literal("text"),
		content: z.string(),
	}),
]);

const SessionMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.union([
		z.string(), // Legacy format
		z.array(MessagePartSchema), // Current format
	]),
	timestamp: z.number(),
});

const TodoSchema = z
	.object({
		id: z.number(),
		content: z.string(),
		status: z.enum(["pending", "in_progress", "completed", "removed"]),
		activeForm: z.string(),
		ordering: z.number(),
	})
	.passthrough(); // Allow additional fields for backward compatibility

const SessionSchema = z.object({
	id: z.string(),
	provider: z.string(), // ProviderId but stored as string
	model: z.string(),
	messages: z.array(SessionMessageSchema),
	todos: z.array(TodoSchema).optional(), // Optional for migration
	nextTodoId: z.number().optional(), // Optional for migration
	created: z.number(),
	updated: z.number(),
});

const SESSION_DIR = join(homedir(), ".sylphx", "sessions");
const LAST_SESSION_FILE = join(SESSION_DIR, ".last-session");

/**
 * Ensure session directory exists
 */
async function ensureSessionDir(): Promise<void> {
	await mkdir(SESSION_DIR, { recursive: true });
}

/**
 * Get session file path
 */
function getSessionPath(sessionId: string): string {
	return join(SESSION_DIR, `${sessionId}.json`);
}

/**
 * Create new session
 */
export async function createSession(provider: ProviderId, model: string): Promise<Session> {
	await ensureSessionDir();

	const session: Session = {
		id: `session-${Date.now()}`,
		provider,
		model,
		messages: [],
		todos: [], // Initialize empty todos
		nextTodoId: 1, // Start from 1
		created: Date.now(),
		updated: Date.now(),
	};

	await saveSession(session);
	await setLastSession(session.id);

	return session;
}

/**
 * Save session to file
 */
export async function saveSession(session: Session): Promise<void> {
	await ensureSessionDir();
	// Create a new object with updated timestamp (don't mutate readonly session from Zustand)
	const sessionToSave = {
		...session,
		updated: Date.now(),
	};
	const path = getSessionPath(session.id);
	// Use compact JSON format for faster serialization and smaller file size
	await writeFile(path, JSON.stringify(sessionToSave), "utf8");
}

/**
 * Load session from file with migration support
 * Automatically adds missing fields from newer schema versions
 */
export async function loadSession(sessionId: string): Promise<Session | null> {
	try {
		const path = getSessionPath(sessionId);
		const content = await readFile(path, "utf8");

		// Parse and validate with Zod
		const parsed = SessionSchema.parse(JSON.parse(content));

		// Migration: Add todos/nextTodoId if missing
		const todos = parsed.todos ?? [];
		const nextTodoId = parsed.nextTodoId ?? 1;

		// Migration: Normalize message content format
		// Old: { content: string }
		// New: { content: MessagePart[] }
		const messages = parsed.messages.map((msg) => {
			if (typeof msg.content === "string") {
				return {
					...msg,
					content: [{ type: "text", text: msg.content }],
				};
			}
			return msg;
		});

		return {
			...parsed,
			todos,
			nextTodoId,
			messages,
		} as Session;
	} catch (_error) {
		// Return null for any error (file not found, invalid JSON, validation failure)
		return null;
	}
}

/**
 * Get last session ID
 */
export async function getLastSessionId(): Promise<string | null> {
	try {
		const content = await readFile(LAST_SESSION_FILE, "utf8");
		return content.trim();
	} catch {
		return null;
	}
}

/**
 * Set last session ID
 */
export async function setLastSession(sessionId: string): Promise<void> {
	await ensureSessionDir();
	await writeFile(LAST_SESSION_FILE, sessionId, "utf8");
}

/**
 * Load last session
 */
export async function loadLastSession(): Promise<Session | null> {
	const sessionId = await getLastSessionId();
	if (!sessionId) return null;
	return loadSession(sessionId);
}

/**
 * Add message to session (in-memory helper for headless mode)
 * Converts string content to MessagePart[] format
 */
export function addMessage(session: Session, role: "user" | "assistant", content: string): Session {
	return {
		...session,
		messages: [
			...session.messages,
			{
				role,
				content: [{ type: "text", text: content }], // FIX: Use 'text' field, not 'content'
				timestamp: Date.now(),
			},
		],
	};
}

/**
 * Clear session messages but keep metadata
 */
export function clearSessionMessages(session: Session): Session {
	return {
		...session,
		messages: [],
		updated: Date.now(),
	};
}
