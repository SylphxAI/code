/**
 * App Context - Pure Effect.ts Services
 * Full functional composition using Effect.ts
 *
 * Architecture:
 * - All services are Effect-based (Context + Layer)
 * - Type-safe dependency injection
 * - Explicit error handling
 * - Composable effects
 */

import { Effect, Context, Layer } from 'effect';
import type { Agent, Rule } from '@sylphx/code-core';
import {
  SessionRepository,
  initializeDatabase,
  loadAllAgents,
  loadAllRules,
  DEFAULT_AGENT_ID,
} from '@sylphx/code-core';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// ============================================================================
// Configuration
// ============================================================================

export interface DatabaseConfig {
  url?: string;
  authToken?: string;
}

export interface AppConfig {
  database?: DatabaseConfig;
  cwd: string;
}

// ============================================================================
// Database Service (Effect)
// ============================================================================

export interface DatabaseServiceShape {
  readonly getRepository: Effect.Effect<SessionRepository>;
  readonly getDB: Effect.Effect<DrizzleD1Database<any>>;
}

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  DatabaseServiceShape
>() {}

export const makeDatabaseService = (config: DatabaseConfig) =>
  Effect.gen(function* () {
    // Initialize database
    const db = yield* Effect.promise(() => initializeDatabase(() => {}));
    const repository = new SessionRepository(db);

    return {
      getRepository: Effect.succeed(repository),
      getDB: Effect.succeed(db),
    };
  });

export const DatabaseServiceLive = (config: DatabaseConfig) =>
  Layer.effect(DatabaseService, makeDatabaseService(config));

// ============================================================================
// Agent Manager Service (Effect)
// ============================================================================

const FALLBACK_AGENT: Agent = {
  id: DEFAULT_AGENT_ID,
  metadata: {
    name: 'Coder',
    description: 'Default coding assistant',
  },
  systemPrompt: 'You are a helpful coding assistant.',
  isBuiltin: true,
};

export interface AgentManagerServiceShape {
  readonly getAll: Effect.Effect<Agent[]>;
  readonly getById: (id: string) => Effect.Effect<Agent | null>;
  readonly reload: Effect.Effect<void>;
}

export class AgentManagerService extends Context.Tag('AgentManagerService')<
  AgentManagerService,
  AgentManagerServiceShape
>() {}

export const makeAgentManagerService = (cwd: string) =>
  Effect.gen(function* () {
    // Load agents
    const allAgents = yield* Effect.promise(() => loadAllAgents(cwd));
    const agentsMap = new Map(allAgents.map(a => [a.id, a]));

    return {
      getAll: Effect.succeed(Array.from(agentsMap.values())),
      getById: (id: string) => Effect.succeed(agentsMap.get(id) || null),
      reload: Effect.promise(() => loadAllAgents(cwd)).pipe(
        Effect.map(agents => {
          agentsMap.clear();
          agents.forEach(a => agentsMap.set(a.id, a));
        })
      ),
    };
  });

export const AgentManagerServiceLive = (cwd: string) =>
  Layer.effect(AgentManagerService, makeAgentManagerService(cwd));

// ============================================================================
// Rule Manager Service (Effect)
// ============================================================================

export interface RuleManagerServiceShape {
  readonly getAll: Effect.Effect<Rule[]>;
  readonly getById: (id: string) => Effect.Effect<Rule | null>;
  readonly getEnabled: (enabledIds: string[]) => Effect.Effect<Rule[]>;
  readonly reload: Effect.Effect<void>;
}

export class RuleManagerService extends Context.Tag('RuleManagerService')<
  RuleManagerService,
  RuleManagerServiceShape
>() {}

export const makeRuleManagerService = (cwd: string) =>
  Effect.gen(function* () {
    // Load rules
    const allRules = yield* Effect.promise(() => loadAllRules(cwd));
    const rulesMap = new Map(allRules.map(r => [r.id, r]));

    return {
      getAll: Effect.succeed(Array.from(rulesMap.values())),
      getById: (id: string) => Effect.succeed(rulesMap.get(id) || null),
      getEnabled: (enabledIds: string[]) =>
        Effect.succeed(
          enabledIds
            .map(id => rulesMap.get(id))
            .filter((r): r is Rule => r !== undefined)
        ),
      reload: Effect.promise(() => loadAllRules(cwd)).pipe(
        Effect.map(rules => {
          rulesMap.clear();
          rules.forEach(r => rulesMap.set(r.id, r));
        })
      ),
    };
  });

export const RuleManagerServiceLive = (cwd: string) =>
  Layer.effect(RuleManagerService, makeRuleManagerService(cwd));

// ============================================================================
// App Context - Composition Root
// ============================================================================

/**
 * Combined app layer with all services
 */
export const makeAppLayer = (config: AppConfig) =>
  Layer.mergeAll(
    DatabaseServiceLive(config.database || {}),
    AgentManagerServiceLive(config.cwd),
    RuleManagerServiceLive(config.cwd)
  );

/**
 * Services container (plain objects for easy access)
 */
export interface Services {
  database: DatabaseServiceShape;
  agentManager: AgentManagerServiceShape;
  ruleManager: RuleManagerServiceShape;
}

/**
 * AppContext interface for external use
 */
export interface AppContext {
  services: Services;
  config: AppConfig;
}

/**
 * Create app context
 */
export async function createAppContext(config: AppConfig): Promise<AppContext> {
  const layer = makeAppLayer(config);

  // Build layer and extract services
  const services = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const scope = yield* Effect.scope;
        const context = yield* Layer.buildWithScope(layer, scope);

        const database = Context.get(context, DatabaseService);
        const agentManager = Context.get(context, AgentManagerService);
        const ruleManager = Context.get(context, RuleManagerService);

        return {
          database,
          agentManager,
          ruleManager,
        };
      })
    )
  );

  return {
    services,
    config,
  };
}

/**
 * Initialize app context (no-op - initialization happens in createAppContext)
 */
export async function initializeAppContext(ctx: AppContext): Promise<void> {
  // No-op: initialization happens in createAppContext
}

/**
 * Close app context
 */
export async function closeAppContext(ctx: AppContext): Promise<void> {
  // Future: Add cleanup logic
}
