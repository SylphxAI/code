/**
 * Stream Event Handler Types
 * Shared types used across all event handlers
 */

import type { LensClient } from "@lens/client";
import type { AIConfig } from "@sylphx/code-core";
import type React from "react";

/**
 * Context passed to all event handlers
 */
export interface EventHandlerContext {
	/** Lens client (passed from React hook useLensClient) */
	client: LensClient<any, any>;
	currentSessionId: string | null;
	updateSessionTitle: (sessionId: string, title: string) => void;
	setIsStreaming: (value: boolean) => void;
	setIsTitleStreaming: (value: boolean) => void;
	setStreamingTitle: React.Dispatch<React.SetStateAction<string>>;
	streamingMessageIdRef: React.MutableRefObject<string | null>;
	addLog: (message: string) => void;
	aiConfig: AIConfig | null;
	userMessage: string;
	notificationSettings: { notifyOnCompletion: boolean; notifyOnError: boolean };
	setPendingInput: (input: any) => void; // For ask tool events
	askToolContextRef?: React.MutableRefObject<{
		sessionId: string;
		toolCallId: string;
	} | null>; // For server-side ask tool
	/**
	 * Track current step index for content events
	 * Set by step-start, cleared by step-complete
	 * Used to skip content events during replay when step already exists
	 */
	currentStepIndexRef: React.MutableRefObject<number | null>;
	/**
	 * Track if current step was skipped (already exists)
	 * Content events should be skipped until step-complete
	 */
	skipContentForStepRef: React.MutableRefObject<boolean>;
	/** Set streaming start time for duration display */
	setStreamingStartTime: (time: number | null) => void;
	/** Set cumulative output tokens during streaming */
	setStreamingOutputTokens: (tokens: number | ((prev: number) => number)) => void;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: any, context: EventHandlerContext) => void;
