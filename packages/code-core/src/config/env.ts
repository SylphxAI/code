/**
 * Centralized Environment Variable Access
 * Single source of truth for all process.env access with type safety via Zod
 *
 * Benefits:
 * - Type-safe environment variables
 * - Default values in one place
 * - Easy to mock in tests
 * - Clear documentation of what env vars exist
 *
 * Usage:
 * ```ts
 * import { env } from '@/config/env';
 * const port = env.SERVER_PORT;  // Type-safe!
 * ```
 */

import { z } from "zod";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("env");

/**
 * Environment schema with validation and defaults
 */
const envSchema = z.object({
	// Server configuration
	SERVER_HOST: z.string().default("localhost"),
	SERVER_PORT: z.coerce.number().int().positive().default(3000),
	WEB_PORT: z.coerce.number().int().positive().default(8080),

	// Environment
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

	// Timeouts (milliseconds)
	REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
	API_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

	// Home directory (for config)
	HOME: z.string().default(process.cwd()),

	// Debug logging
	DEBUG: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws error if validation fails
 */
function parseEnv(): Env {
	try {
		return envSchema.parse(process.env);
	} catch (error) {
		if (error instanceof z.ZodError) {
			logger("❌ Environment variable validation failed:");
			for (const issue of error.issues) {
				logger(`  - ${issue.path.join(".")}: ${issue.message}`);
			}
			throw new Error("Invalid environment variables");
		}
		throw error;
	}
}

/**
 * Validated environment variables
 * Import this instead of accessing process.env directly
 */
export const env = parseEnv();

/**
 * Helper: Get server URL
 */
export function getServerURL(host = env.SERVER_HOST, port = env.SERVER_PORT): string {
	return `http://${host}:${port}`;
}

/**
 * Helper: Get web UI URL
 */
export function getWebURL(host = env.SERVER_HOST, port = env.WEB_PORT): string {
	return `http://${host}:${port}`;
}

/**
 * Helper: Check if in development mode
 */
export function isDevelopment(): boolean {
	return env.NODE_ENV === "development";
}

/**
 * Helper: Check if in production mode
 */
export function isProduction(): boolean {
	return env.NODE_ENV === "production";
}

/**
 * Helper: Check if in test mode
 */
export function isTest(): boolean {
	return env.NODE_ENV === "test";
}
