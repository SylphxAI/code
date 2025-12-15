/**
 * Browser-safe exports from @sylphx/code-client
 *
 * This entry point only exports the lens client and types,
 * without Node.js-dependent utilities from code-core.
 */

// ============================================================================
// Lens Client (browser-safe)
// ============================================================================
export {
	createCodeClient,
	getClient,
	initClient,
	isClientInitialized,
	useLensClient,
	direct,
	http,
	type CodeClient,
	type Transport,
} from "./lens.js";

// ============================================================================
// Types (no runtime dependencies)
// ============================================================================
export type { MessagePart, ProviderId } from "@sylphx/code-core";

export interface Provider {
	id: string;
	name: string;
	isConfigured: boolean;
}

export interface ModelInfo {
	id: string;
	name: string;
	contextWindow?: number;
	maxOutputTokens?: number;
}

export interface BashProcess {
	id: string;
	command: string;
	mode: "active" | "background";
	status: string;
	isActive?: boolean;
	startTime: number;
	endTime?: number;
	exitCode?: number;
	cwd: string;
	duration: number;
	stdout?: string;
	stderr?: string;
}

// ============================================================================
// Version
// ============================================================================
export const version = "0.1.0";
