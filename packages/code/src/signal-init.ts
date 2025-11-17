/**
 * Signal Initialization
 * Initialize SolidJS signals before React app starts
 */

// NOTE: Persistence is browser-only (uses localStorage) and disabled for CLI
// No initialization needed for SolidJS signals - they auto-initialize on import

// Initialize signal persistence and effects
export const initializeSignals = () => {
	// No-op: SolidJS signals are initialized automatically on import
	// Persistence disabled: CLI apps don't use localStorage
	// Effects initialized via React hooks in App component
};
