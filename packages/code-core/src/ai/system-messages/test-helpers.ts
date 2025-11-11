/**
 * Test Helpers for System Messages
 * Mock and simulation tools for testing system message triggers
 */

import type { TriggerContext } from './registry.js';
import type { Session } from '../../types/session.types.js';

/**
 * Mock context token usage for testing
 * Simulates gradual increase in context usage
 */
export function mockContextTokens(
  session: Session,
  options: {
    baseUsage?: number;      // Starting usage (default: 0.3 = 30%)
    increasePerMessage?: number; // Increase per message (default: 0.05 = 5%)
    randomVariation?: number;    // Random variation ±% (default: 0.02 = 2%)
    maxContextLength?: number;   // Max tokens (default: 200000)
  } = {}
): { current: number; max: number } | undefined {
  const {
    baseUsage = 0.3,
    increasePerMessage = 0.05,
    randomVariation = 0.02,
    maxContextLength = 200000,
  } = options;

  // Count messages to simulate progression
  const messageCount = session.messages.length;

  // Calculate usage with progression
  let usage = baseUsage + (messageCount * increasePerMessage);

  // Add random variation
  usage += (Math.random() - 0.5) * 2 * randomVariation;

  // Clamp between 0 and 1
  usage = Math.max(0, Math.min(1, usage));

  const currentTokens = Math.floor(usage * maxContextLength);

  console.log(`🧪 [mockContextTokens] Message ${messageCount}: ${Math.floor(usage * 100)}% (${currentTokens}/${maxContextLength})`);

  return {
    current: currentTokens,
    max: maxContextLength,
  };
}

/**
 * Mock system status for testing
 * Simulates resource usage with random fluctuations
 */
export function mockSystemStatus(
  options: {
    baseCpu?: number;       // Base CPU % (default: 30)
    baseMemory?: number;    // Base memory GB (default: 8.0)
    maxMemory?: number;     // Max memory GB (default: 16.0)
    variation?: number;     // Variation % (default: 20)
  } = {}
): { cpu: string; memory: string } {
  const {
    baseCpu = 30,
    baseMemory = 8.0,
    maxMemory = 16.0,
    variation = 20,
  } = options;

  // Random fluctuation
  const cpuVariation = (Math.random() - 0.5) * 2 * variation;
  const memVariation = (Math.random() - 0.5) * 2 * (maxMemory * 0.1);

  const cpu = Math.max(0, Math.min(100, baseCpu + cpuVariation));
  const memory = Math.max(0, Math.min(maxMemory, baseMemory + memVariation));

  return {
    cpu: `${cpu.toFixed(1)}%`,
    memory: `${memory.toFixed(1)}GB/${maxMemory.toFixed(1)}GB`,
  };
}

/**
 * Create mock trigger context with simulated usage
 */
export function createMockContext(
  session: Session,
  options: {
    mockContext?: boolean;     // Enable context mocking (default: false)
    mockResources?: boolean;   // Enable resource mocking (default: false)
    contextOptions?: Parameters<typeof mockContextTokens>[1];
    resourceOptions?: Parameters<typeof mockSystemStatus>[0];
  } = {}
): Partial<TriggerContext> {
  const context: Partial<TriggerContext> = {
    session,
  };

  // Mock context tokens if enabled
  if (options.mockContext) {
    context.contextTokens = mockContextTokens(session, options.contextOptions);
  }

  // Note: Resource mocking requires replacing getSystemStatus globally
  // This is handled in the test mode setup

  return context;
}

/**
 * Test mode flag checker
 */
export function isTestMode(): boolean {
  return process.env.TEST_MODE === '1' || process.env.TEST_MODE === 'true';
}

/**
 * Enable context mocking for a session
 * This should be called before checking triggers
 */
export function enableContextMocking(session: Session): Session {
  // Add a flag to indicate mocking is enabled
  return {
    ...session,
    flags: {
      ...session.flags,
      __mockContext: true,
    },
  };
}

/**
 * Check if context mocking is enabled for a session
 */
export function isContextMockingEnabled(session: Session): boolean {
  return session.flags?.__mockContext === true;
}

/**
 * Create progressive mock scenario
 * Returns a function that provides increasing usage over time
 */
export function createProgressiveScenario(options: {
  startAt?: number;     // Starting % (default: 0.2 = 20%)
  endAt?: number;       // Ending % (default: 0.95 = 95%)
  steps?: number;       // Number of steps (default: 20)
} = {}) {
  const { startAt = 0.2, endAt = 0.95, steps = 20 } = options;

  let currentStep = 0;

  return () => {
    if (currentStep >= steps) {
      return endAt;
    }

    const progress = currentStep / steps;
    const usage = startAt + (endAt - startAt) * progress;

    currentStep++;

    return usage;
  };
}
