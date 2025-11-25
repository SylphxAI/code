/**
 * Title Generator
 * Handles parallel title generation with real-time streaming
 */

import type { AIConfig, Session, SessionRepository } from "@sylphx/code-core";
import type { AppContext } from "../../context.js";
import { publishTitleUpdate } from "../event-publisher.js";

/**
 * Title streaming callbacks for real-time updates
 */
export interface TitleStreamCallbacks {
	onStart: () => void;
	onDelta: (text: string) => void;
	onEnd: (title: string) => void;
}

/**
 * Generate session title with real-time streaming updates
 * Returns a promise that resolves when title generation is complete
 */
export async function generateSessionTitle(
	appContext: AppContext,
	sessionRepository: SessionRepository,
	aiConfig: AIConfig,
	session: Session,
	userMessage: string,
	callbacks?: TitleStreamCallbacks,
): Promise<string | null> {
	try {
		const { streamText } = await import("ai");
		const { cleanAITitle, getProvider } = await import("@sylphx/code-core");

		const provider = session.provider;
		const modelName = session.model;
		const providerConfig = aiConfig?.providers?.[provider];

		if (!providerConfig) {
			return null;
		}

		const providerInstance = getProvider(provider);
		if (!providerInstance.isConfigured(providerConfig)) {
			return null;
		}

		const model = await providerInstance.createClient(providerConfig, modelName);

		// Use AI SDK's streamText directly for title generation
		const { fullStream } = streamText({
			model,
			system: `Generate a concise title for this conversation.

Requirements:
- 2-6 words maximum
- Descriptive and specific (what is the user asking or doing?)
- No filler words ("about", "how to", "question about")
- No punctuation at the end
- Direct and clear

Examples:
- User: "Help me debug this error" → Title: "Debug error"
- User: "How do I install Node.js?" → Title: "Install Node.js"
- User: "Explain quantum computing" → Title: "Quantum computing explanation"
- User: "Write a function to sort arrays" → Title: "Array sorting function"

Output only the title, nothing else.`,
			messages: [
				{
					role: "user",
					content: userMessage,
				},
			],
			// No tools - title generation doesn't need them
		});

		let fullTitle = "";

		// Emit start event - session entity with empty title
		if (callbacks) {
			callbacks.onStart();
		} else {
			// Publish session entity directly (Lens format)
			const sessionUpdate = {
				id: session.id,
				title: "", // Empty title indicates title generation started
				updatedAt: Date.now(),
			};
			// Fire-and-forget publish (non-blocking, same as message streaming)
			appContext.eventStream.publish(`session:${session.id}`, sessionUpdate).catch((err) => {
				console.error("[TitleGen] Failed to publish START event:", err);
			});
		}

		// Stream title chunks
		try {
			for await (const chunk of fullStream) {
				if (chunk.type === "text-delta" && chunk.text) {
					fullTitle += chunk.text;

					// Emit delta - session entity with incrementally updated title
					if (callbacks) {
						callbacks.onDelta(chunk.text);
					} else {
						// Publish session entity directly (Lens format)
						const sessionUpdate = {
							id: session.id,
							title: fullTitle, // Send full accumulated title so far
							updatedAt: Date.now(),
						};
						// Fire-and-forget publish (non-blocking, same as message streaming)
						appContext.eventStream.publish(`session:${session.id}`, sessionUpdate).catch((err) => {
							console.error("[TitleGen] Failed to publish DELTA event:", err);
						});
					}
				}
			}
		} catch (streamError) {
			// Catch NoOutputGeneratedError and other stream errors
			console.error("[Title Generation] Stream error:", streamError);
		}

		// Clean up and update database (only if we got some title)
		if (fullTitle.length > 0) {
			const cleaned = cleanAITitle(fullTitle, 50);

			try {
				await sessionRepository.updateSession(session.id, { title: cleaned });

				// Emit end event
				if (callbacks) {
					callbacks.onEnd(cleaned);
				} else {
					// Publish to both channels for UC5: Selective Event Delivery
					await publishTitleUpdate(appContext.eventStream, session.id, cleaned);
				}
				return cleaned;
			} catch (dbError) {
				console.error("[Title Generation] Failed to save title:", dbError);
				return cleaned; // Return title even if DB save failed
			}
		}

		return null;
	} catch (error) {
		console.error("[Title Generation] Error:", error);
		return null;
	}
}

/**
 * Check if session needs title generation
 */
export function needsTitleGeneration(
	session: Session,
	isNewSession: boolean,
	isFirstMessage: boolean,
): boolean {
	const needsTitle = isNewSession || !session.title || session.title === "New Chat";
	return needsTitle && isFirstMessage;
}
