/**
 * Command System - 統一命令系統
 * Feature-first, composable, functional command architecture
 */
import { logger } from "../utils/logger.js";
import { withErrorHandling } from "./error-handling.js";
import { err, ok } from "./result.js";
/**
 * Command registry
 */
export class CommandRegistry {
    commands = new Map();
    aliases = new Map();
    globalMiddleware = [];
    /**
     * Register a command
     */
    register(command) {
        // Validate command
        if (!command.name || !command.description || !command.handler) {
            throw new Error("Command must have name, description, and handler");
        }
        // Check for conflicts
        if (this.commands.has(command.name)) {
            throw new Error(`Command already registered: ${command.name}`);
        }
        // Register command
        this.commands.set(command.name, command);
        // Register aliases
        if (command.aliases) {
            for (const alias of command.aliases) {
                if (this.commands.has(alias) || this.aliases.has(alias)) {
                    throw new Error(`Alias already registered: ${alias}`);
                }
                this.aliases.set(alias, command.name);
            }
        }
        logger.debug("Command registered", {
            name: command.name,
            aliases: command.aliases,
            options: command.options?.length || 0,
        });
    }
    /**
     * Unregister a command
     */
    unregister(name) {
        const command = this.commands.get(name);
        if (!command)
            return false;
        // Remove command
        this.commands.delete(name);
        // Remove aliases
        if (command.aliases) {
            for (const alias of command.aliases) {
                this.aliases.delete(alias);
            }
        }
        logger.debug("Command unregistered", { name });
        return true;
    }
    /**
     * Get command by name or alias
     */
    get(nameOrAlias) {
        // Try direct name
        const command = this.commands.get(nameOrAlias);
        if (command)
            return command;
        // Try alias
        const commandName = this.aliases.get(nameOrAlias);
        if (commandName) {
            return this.commands.get(commandName) || null;
        }
        return null;
    }
    /**
     * Check if command exists
     */
    has(nameOrAlias) {
        return this.commands.has(nameOrAlias) || this.aliases.has(nameOrAlias);
    }
    /**
     * List all commands
     */
    list() {
        return Array.from(this.commands.values());
    }
    /**
     * Get command names
     */
    names() {
        return Array.from(this.commands.keys());
    }
    /**
     * Add global middleware
     */
    addMiddleware(middleware) {
        this.globalMiddleware.push(middleware);
        logger.debug("Global middleware added", { name: middleware.name });
    }
    /**
     * Remove global middleware
     */
    removeMiddleware(name) {
        const index = this.globalMiddleware.findIndex((m) => m.name === name);
        if (index > -1) {
            this.globalMiddleware.splice(index, 1);
            logger.debug("Global middleware removed", { name });
            return true;
        }
        return false;
    }
    /**
     * Execute a command
     */
    async execute(nameOrAlias, options = {}, args = []) {
        const command = this.get(nameOrAlias);
        if (!command) {
            return err(new Error(`Command not found: ${nameOrAlias}`));
        }
        const context = {
            command,
            options,
            args,
            startTime: Date.now(),
        };
        logger.info("Executing command", {
            name: command.name,
            args,
            options,
        });
        try {
            // Validate options
            const validationResult = this.validateOptions(command, options);
            if (!validationResult.success) {
                return validationResult;
            }
            // Apply global middleware (before)
            for (const middleware of this.globalMiddleware) {
                if (middleware.before) {
                    await middleware.before(context);
                }
            }
            // Apply command middleware (before)
            if (command.middleware) {
                for (const middleware of command.middleware) {
                    if (middleware.before) {
                        await middleware.before(context);
                    }
                }
            }
            // Execute command
            const result = await command.handler(context);
            // Apply command middleware (after)
            if (command.middleware) {
                for (const middleware of command.middleware) {
                    if (middleware.after) {
                        await middleware.after(context, result);
                    }
                }
            }
            // Apply global middleware (after)
            for (const middleware of this.globalMiddleware) {
                if (middleware.after) {
                    await middleware.after(context, result);
                }
            }
            const duration = Date.now() - context.startTime;
            logger.info("Command completed", {
                name: command.name,
                success: result.success,
                duration,
            });
            return result;
        }
        catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            // Apply command middleware (onError)
            if (command.middleware) {
                for (const middleware of command.middleware) {
                    if (middleware.onError) {
                        await middleware.onError(context, errorObj);
                    }
                }
            }
            // Apply global middleware (onError)
            for (const middleware of this.globalMiddleware) {
                if (middleware.onError) {
                    await middleware.onError(context, errorObj);
                }
            }
            const duration = Date.now() - context.startTime;
            logger.error("Command failed", {
                name: command.name,
                error: errorObj.message,
                duration,
            });
            return err(errorObj);
        }
    }
    /**
     * Validate command options
     */
    validateOptions(command, options) {
        if (!command.options)
            return ok(undefined);
        for (const option of command.options) {
            const value = options[option.name];
            // Check required options
            if (option.required && (value === undefined || value === null)) {
                return err(new Error(`Required option missing: ${option.name}`));
            }
            // Use default value
            if (value === undefined && option.default !== undefined) {
                options[option.name] = option.default;
                continue;
            }
            // Skip validation if value is not provided
            if (value === undefined || value === null) {
                continue;
            }
            // Type validation
            if (option.type === "number" && typeof value !== "number") {
                const num = Number(value);
                if (Number.isNaN(num)) {
                    return err(new Error(`Invalid number for option ${option.name}: ${value}`));
                }
                options[option.name] = num;
            }
            if (option.type === "boolean" && typeof value !== "boolean") {
                if (typeof value === "string") {
                    options[option.name] = value.toLowerCase() === "true";
                }
                else {
                    options[option.name] = Boolean(value);
                }
            }
            if (option.type === "array" && !Array.isArray(value)) {
                if (typeof value === "string") {
                    options[option.name] = value.split(",").map((s) => s.trim());
                }
                else {
                    return err(new Error(`Invalid array for option ${option.name}: ${value}`));
                }
            }
            // Choice validation
            if (option.choices && !option.choices.includes(options[option.name])) {
                return err(new Error(`Invalid choice for option ${option.name}: ${value}. Must be one of: ${option.choices.join(", ")}`));
            }
            // Custom validation
            if (option.validate) {
                const validation = option.validate(options[option.name]);
                if (validation !== true) {
                    return err(new Error(typeof validation === "string"
                        ? validation
                        : `Invalid value for option ${option.name}: ${value}`));
                }
            }
        }
        return ok(undefined);
    }
}
/**
 * Command builder
 */
export class CommandBuilder {
    command = {};
    name(name) {
        this.command.name = name;
        return this;
    }
    description(description) {
        this.command.description = description;
        return this;
    }
    handler(handler) {
        this.command.handler = handler;
        return this;
    }
    option(option) {
        if (!this.command.options) {
            this.command.options = [];
        }
        this.command.options.push(option);
        return this;
    }
    middleware(middleware) {
        if (!this.command.middleware) {
            this.command.middleware = [];
        }
        this.command.middleware.push(middleware);
        return this;
    }
    examples(examples) {
        this.command.examples = examples;
        return this;
    }
    aliases(aliases) {
        this.command.aliases = aliases;
        return this;
    }
    build() {
        if (!this.command.name || !this.command.description || !this.command.handler) {
            throw new Error("Command must have name, description, and handler");
        }
        return this.command;
    }
}
/**
 * Utility functions
 */
export const CommandUtils = {
    /**
     * Create a new command builder
     */
    builder() {
        return new CommandBuilder();
    },
    /**
     * Create a simple command
     */
    create(name, description, handler) {
        return CommandUtils.builder()
            .name(name)
            .description(description)
            .handler(async (context) => {
            return withErrorHandling(() => handler(context.options));
        })
            .build();
    },
    /**
     * Create a command with options
     */
    createWithOptions(name, description, options, handler) {
        return CommandUtils.builder()
            .name(name)
            .description(description)
            .options(...options)
            .handler(async (context) => {
            return withErrorHandling(() => handler(context.options));
        })
            .build();
    },
    /**
     * Create option definitions
     */
    option: {
        string: (name, description, required = false) => ({
            name,
            description,
            type: "string",
            required,
        }),
        number: (name, description, required = false) => ({
            name,
            description,
            type: "number",
            required,
        }),
        boolean: (name, description) => ({
            name,
            description,
            type: "boolean",
        }),
        array: (name, description) => ({
            name,
            description,
            type: "array",
        }),
        choice: (name, description, choices, required = false) => ({
            name,
            description,
            type: "string",
            required,
            choices,
        }),
    },
    /**
     * Common middleware
     */
    middleware: {
        logging: () => ({
            name: "logging",
            before: async (context) => {
                logger.debug("Command started", {
                    name: context.command.name,
                    options: context.options,
                });
            },
            after: async (context, result) => {
                logger.debug("Command completed", {
                    name: context.command.name,
                    success: result.success,
                    duration: Date.now() - context.startTime,
                });
            },
            onError: async (context, error) => {
                logger.error("Command failed", {
                    name: context.command.name,
                    error: error.message,
                    duration: Date.now() - context.startTime,
                });
            },
        }),
        timing: () => ({
            name: "timing",
            before: async (context) => {
                context.metadata = { ...context.metadata, startTime: Date.now() };
            },
            after: async (context, _result) => {
                const duration = Date.now() - (context.metadata?.startTime || context.startTime);
                logger.info(`Command "${context.command.name}" executed in ${duration}ms`);
            },
        }),
    },
};
//# sourceMappingURL=command-system.js.map