/**
 * Centralized logging utility for Sylphx Flow
 * Provides structured logging with different levels and output formats
 */
import { randomUUID } from "node:crypto";
import chalk from "chalk";
const LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const LEVEL_COLORS = {
    debug: chalk.gray,
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red,
};
const LEVEL_SYMBOLS = {
    debug: "🔍",
    info: "ℹ",
    warn: "⚠",
    error: "✗",
};
/**
 * Create a logger instance with the specified configuration and context
 */
export function createLogger(options = {}) {
    // Handle string argument (module name)
    if (typeof options === "string") {
        options = { module: options };
    }
    // Handle both old style (config object) and new style (options with config and context)
    const isOptionsStyle = "config" in options || "context" in options;
    const config = isOptionsStyle
        ? options.config || {}
        : options;
    const initialContext = isOptionsStyle ? options.context : undefined;
    const state = {
        config: {
            level: "info",
            format: "pretty",
            includeTimestamp: true,
            includeContext: true,
            colors: true,
            ...config,
        },
        context: initialContext,
    };
    /**
     * Check if a log level should be output
     */
    const shouldLog = (level) => {
        return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[state.config.level];
    };
    /**
     * Create a log entry
     */
    const createLogEntry = (level, message, error, additionalContext) => {
        const entry = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            level,
            message,
            module: state.context?.module,
            function: state.context?.function,
        };
        // Merge contexts
        if (state.config.includeContext) {
            entry.context = { ...state.context, ...additionalContext };
        }
        // Add error information if provided
        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
            // Add error code if it's a CLIError
            if ("code" in error && typeof error.code === "string") {
                entry.error.code = error.code;
            }
        }
        return entry;
    };
    /**
     * Format a log entry for output
     */
    const formatEntry = (entry) => {
        switch (state.config.format) {
            case "json":
                return JSON.stringify(entry);
            case "simple": {
                const levelStr = entry.level.toUpperCase().padEnd(5);
                const moduleStr = entry.module ? `[${entry.module}] ` : "";
                return `${levelStr} ${moduleStr}${entry.message}`;
            }
            default: {
                const parts = [];
                // Timestamp
                if (state.config.includeTimestamp) {
                    const time = new Date(entry.timestamp).toLocaleTimeString();
                    parts.push(chalk.gray(time));
                }
                // Level symbol and name
                const colorFn = state.config.colors ? LEVEL_COLORS[entry.level] : (s) => s;
                parts.push(`${colorFn(LEVEL_SYMBOLS[entry.level])} ${colorFn(entry.level.toUpperCase().padEnd(5))}`);
                // Module
                if (entry.module) {
                    parts.push(chalk.cyan(`[${entry.module}]`));
                }
                // Function
                if (entry.function) {
                    parts.push(chalk.gray(`${entry.function}()`));
                }
                // Message
                parts.push(entry.message);
                let result = parts.join(" ");
                // Context
                if (entry.context && Object.keys(entry.context).length > 0) {
                    const contextStr = JSON.stringify(entry.context, null, 2);
                    result += `\n${chalk.gray("  Context: ")}${chalk.gray(contextStr)}`;
                }
                // Error details
                if (entry.error) {
                    result += `\n${chalk.red("  Error: ")}${chalk.red(entry.error.message)}`;
                    if (entry.error.code) {
                        result += `\n${chalk.red("  Code: ")}${chalk.red(entry.error.code)}`;
                    }
                    if (entry.error.stack) {
                        result += `\n${chalk.gray(entry.error.stack)}`;
                    }
                }
                return result;
            }
        }
    };
    /**
     * Internal logging method
     */
    const logInternal = (level, message, error, additionalContext) => {
        if (!shouldLog(level)) {
            return;
        }
        const entry = createLogEntry(level, message, error, additionalContext);
        const formatted = formatEntry(entry);
        // Output to appropriate stream
        if (level === "error") {
            console.error(formatted);
        }
        else {
            console.log(formatted);
        }
    };
    /**
     * Create a child logger with additional context
     */
    const child = (context) => {
        return createLogger({
            config: state.config,
            context: { ...state.context, ...context },
        });
    };
    /**
     * Create a logger for a specific module
     */
    const module = (moduleName) => {
        return child({ module: moduleName });
    };
    /**
     * Set the log level
     */
    const setLevel = (level) => {
        state.config.level = level;
    };
    /**
     * Update logger configuration
     */
    const updateConfig = (config) => {
        state.config = { ...state.config, ...config };
    };
    /**
     * Debug level logging
     */
    const debug = (message, context) => {
        logInternal("debug", message, undefined, context);
    };
    /**
     * Info level logging
     */
    const info = (message, context) => {
        logInternal("info", message, undefined, context);
    };
    /**
     * Warning level logging
     */
    const warn = (message, context) => {
        logInternal("warn", message, undefined, context);
    };
    /**
     * Error level logging
     */
    const error = (message, errorObj, context) => {
        logInternal("error", message, errorObj, context);
    };
    /**
     * Log function execution with timing
     */
    const time = async (fn, label, context) => {
        const start = Date.now();
        debug(`Starting ${label}`, context);
        try {
            const result = await fn();
            const duration = Date.now() - start;
            info(`Completed ${label}`, { ...context, duration: `${duration}ms` });
            return result;
        }
        catch (caughtError) {
            const duration = Date.now() - start;
            error(`Failed ${label}`, caughtError, {
                ...context,
                duration: `${duration}ms`,
            });
            throw caughtError;
        }
    };
    /**
     * Log function execution (sync) with timing
     */
    const timeSync = (fn, label, context) => {
        const start = Date.now();
        debug(`Starting ${label}`, context);
        try {
            const result = fn();
            const duration = Date.now() - start;
            info(`Completed ${label}`, { ...context, duration: `${duration}ms` });
            return result;
        }
        catch (caughtError) {
            const duration = Date.now() - start;
            error(`Failed ${label}`, caughtError, {
                ...context,
                duration: `${duration}ms`,
            });
            throw caughtError;
        }
    };
    return {
        child,
        module,
        setLevel,
        updateConfig,
        debug,
        info,
        warn,
        error,
        time,
        timeSync,
    };
}
// Default logger instance
export const logger = createLogger();
// Environment-based configuration
if (process.env.NODE_ENV === "production") {
    logger.updateConfig({
        level: "info",
        format: "json",
        colors: false,
    });
}
else if (process.env.DEBUG) {
    logger.updateConfig({
        level: "debug",
    });
}
// Export convenience functions
export const log = {
    debug: (message, context) => logger.debug(message, context),
    info: (message, context) => logger.info(message, context),
    warn: (message, context) => logger.warn(message, context),
    error: (message, error, context) => logger.error(message, error, context),
    time: (fn, label, context) => logger.time(fn, label, context),
    timeSync: (fn, label, context) => logger.timeSync(fn, label, context),
    child: (context) => logger.child(context),
    module: (moduleName) => logger.module(moduleName),
    setLevel: (level) => logger.setLevel(level),
    updateConfig: (config) => logger.updateConfig(config),
};
export default logger;
//# sourceMappingURL=logger.js.map