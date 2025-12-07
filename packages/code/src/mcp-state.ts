/**
 * MCP State - Local MCP status state with React hook
 */

import { useSyncExternalStore } from "react";

type Listener = () => void;

function createState<T>(initial: T) {
	let value = initial;
	const listeners = new Set<Listener>();

	return {
		get: () => value,
		set: (newValue: T) => {
			value = newValue;
			listeners.forEach((l) => l());
		},
		subscribe: (listener: Listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

function useStore<T>(store: ReturnType<typeof createState<T>>): T {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ============================================================================
// MCP Status Types
// ============================================================================

export interface MCPStatus {
	connected: number;
	total: number;
	servers: Record<string, { connected: boolean; error?: string }>;
}

// ============================================================================
// MCP Status State
// ============================================================================

const mcpStatusState = createState<MCPStatus>({
	connected: 0,
	total: 0,
	servers: {},
});

export const setMCPStatus = mcpStatusState.set;
export const getMCPStatus = mcpStatusState.get;
export const useMCPStatus = () => useStore(mcpStatusState);
