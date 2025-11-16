/**
 * Database Utilities
 * Re-exports for convenience
 *
 * NOTE: No global state - use AppContext in code-server for singleton management
 */

export { initializeDatabase } from "./auto-migrate.js";
export { SessionRepository } from "./session-repository.js";
