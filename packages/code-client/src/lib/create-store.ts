/**
 * Create Store Utility
 * Provides a zustand-like API using zen underneath
 *
 * This utility allows stores to maintain the same API surface
 * while using zen's high-performance internals.
 */

import { zen, get, set as zenSet, type Zen } from '@sylphx/zen';
import { useStore as useZenStore } from '@sylphx/zen-react';
import { craftZen } from '@sylphx/zen-craft';

type SetStateAction<T> = T | Partial<T> | ((state: T) => void | Partial<T>);

/**
 * Store creator function signature (zustand-compatible)
 */
export type StateCreator<T> = (
  set: (action: SetStateAction<T>) => void,
  get: () => T
) => T;

/**
 * Store instance with zustand-like API
 */
export interface Store<T> {
  (): T; // Hook for React components (no selector)
  <U>(selector: (state: T) => U): U; // Hook with selector
  getState: () => T;
  setState: (action: SetStateAction<T>) => void;
  subscribe: (listener: (state: T) => void) => () => void;
  destroy: () => void;
}

/**
 * Create a store with zustand-like API powered by zen
 *
 * @example
 * ```typescript
 * const useCountStore = createStore<CountState>((set, get) => ({
 *   count: 0,
 *   increment: () => set(state => { state.count++ }),
 *   decrement: () => set(state => { state.count-- }),
 * }));
 *
 * // In components:
 * const count = useCountStore(state => state.count); // With selector
 * const { count, increment } = useCountStore(); // Without selector
 * ```
 */
export function createStore<T extends object>(
  creator: StateCreator<T>
): Store<T> {
  // Create zen store with placeholder
  let store: Zen<T>;
  let initialized = false;

  // Temporary setState for initialization phase
  const tempSetState = (action: SetStateAction<T>): void => {
    throw new Error('Cannot call setState during store initialization');
  };

  // Temporary getState for initialization phase
  const tempGetState = (): T => {
    throw new Error('Cannot call getState during store initialization');
  };

  // Initialize state using creator (should return initial state, not call set/get)
  const initialState = creator(tempSetState, tempGetState);

  // Now create the actual store with proper initial state
  store = zen(initialState);
  initialized = true;

  // Set implementation using zen-craft for immer-style updates
  const setState = (action: SetStateAction<T>): void => {
    if (!initialized) {
      throw new Error('Store not initialized');
    }

    if (typeof action === 'function') {
      // Function update - use zen-craft for draft pattern
      // Wrap in try-catch to handle edge cases (e.g., null values in state)
      try {
        craftZen(store, action as (draft: T) => void);
      } catch (error) {
        // Fallback: Manual draft-like behavior
        // Clone current state, apply mutations, set result
        const current = get(store);
        const draft = JSON.parse(JSON.stringify(current)) as T;
        const actionFn = action as (state: T) => void | Partial<T>;
        const result = actionFn(draft);

        // If function returns updates, use those; otherwise use mutated draft
        if (result !== undefined && typeof result === 'object') {
          zenSet(store, { ...current, ...result });
        } else {
          zenSet(store, draft);
        }
      }
    } else {
      // Object update - merge with current state
      const current = get(store);
      const updates = action as Partial<T>;
      zenSet(store, { ...current, ...updates });
    }
  };

  // Get implementation
  const getState = (): T => {
    if (!initialized) {
      throw new Error('Store not initialized');
    }
    return get(store);
  };

  // Create React hook with optional selector support
  function useStore(): T;
  function useStore<U>(selector: (state: T) => U): U;
  function useStore<U>(selector?: (state: T) => U): T | U {
    const state = useZenStore(store);
    if (selector) {
      return selector(state);
    }
    return state;
  }

  // Add zustand-compatible methods
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = (listener: (state: T) => void) => {
    // Zen's subscribe API
    return (store as any).listen(listener);
  };
  useStore.destroy = () => {
    // Cleanup if needed
  };

  return useStore as Store<T>;
}
