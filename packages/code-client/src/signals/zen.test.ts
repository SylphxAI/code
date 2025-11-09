/**
 * Zen Signals Core Tests
 * Tests the fundamental Zen signal functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { zen, computed, get, set, subscribe } from '@sylphx/zen';

describe('Zen Signals Core', () => {
  beforeEach(() => {
    // Clean up any subscriptions
  });

  afterEach(() => {
    // Clean up subscriptions
  });

  describe('zen function', () => {
    it('should create a signal with initial value', () => {
      const signal = zen(42);
      expect(get(signal)).toBe(42);
    });

    it('should create a signal with null initial value', () => {
      const signal = zen<string | null>(null);
      expect(get(signal)).toBe(null);
    });

    it('should update signal value with set', () => {
      const signal = zen(0);
      set(signal, 100);
      expect(get(signal)).toBe(100);
    });

    it('should handle different data types', () => {
      const stringSignal = zen('hello');
      const numberSignal = zen(42);
      const booleanSignal = zen(true);
      const arraySignal = zen([1, 2, 3]);

      expect(get(stringSignal)).toBe('hello');
      expect(get(numberSignal)).toBe(42);
      expect(get(booleanSignal)).toBe(true);
      expect(get(arraySignal)).toEqual([1, 2, 3]);
    });
  });

  describe('computed signals', () => {
    it('should create computed signal from dependencies', () => {
      const count = zen(0);
      const doubled = computed([count], (c) => c * 2);

      expect(get(doubled)).toBe(0);
      set(count, 5);
      expect(get(doubled)).toBe(10);
    });

    it('should create computed signal from multiple dependencies', () => {
      const firstName = zen('John');
      const lastName = zen('Doe');
      const fullName = computed([firstName, lastName], (first, last) => `${first} ${last}`);

      expect(get(fullName)).toBe('John Doe');
      set(lastName, 'Smith');
      expect(get(fullName)).toBe('John Smith');
    });

    it('should handle complex computed logic', () => {
      const items = zen([1, 2, 3]);
      const filter = zen(2);
      const filtered = computed([items, filter], (list, min) => list.filter(x => x > min));

      expect(get(filtered)).toEqual([3]);
      set(filter, 0);
      expect(get(filtered)).toEqual([1, 2, 3]);
    });

    it('should recompute only when dependencies change', () => {
      const base = zen(10);
      let computeCount = 0;

      const expensive = computed([base], (value) => {
        computeCount++;
        return value * value;
      });

      expect(get(expensive)).toBe(100); // 10 * 10
      expect(computeCount).toBe(1);

      // Read again without changing dependency
      expect(get(expensive)).toBe(100);
      expect(computeCount).toBe(1); // Should not recompute

      // Change dependency
      set(base, 20);
      expect(get(expensive)).toBe(400); // 20 * 20
      expect(computeCount).toBe(2);
    });
  });

  describe('subscriptions', () => {
    it('should notify subscribers of value changes', () => {
      const signal = zen(0);
      const mockFn = vi.fn();

      const unsubscribe = subscribe(signal, mockFn);

      // Note: Subscription may fire immediately with initial value
      set(signal, 1);
      set(signal, 2);

      expect(mockFn).toHaveBeenCalled();
      // Check that it was called with the updated values
      const calls = mockFn.mock.calls.map(call => call[0]).filter(value => value === 1 || value === 2);
      expect(calls.length).toBeGreaterThanOrEqual(2);

      unsubscribe();
    });

    it('should not notify after unsubscribe', () => {
      const signal = zen(0);
      const mockFn = vi.fn();

      const unsubscribe = subscribe(signal, mockFn);
      unsubscribe();

      // Reset call count to ignore initial call
      mockFn.mockClear();
      set(signal, 1);

      // May have been called with initial value before unsubscribe
      // but should not be called with new value
      expect(mockFn).not.toHaveBeenCalledWith(1);
    });

    it('should notify computed signal subscribers', () => {
      const base = zen(0);
      const computedSignal = computed([base], (x) => x * 2);
      const mockFn = vi.fn();

      subscribe(computedSignal, mockFn);
      set(base, 5);

      expect(mockFn).toHaveBeenCalled();
      // Should receive the computed value
      const computedCalls = mockFn.mock.calls.map(call => call[0]).filter(value => value === 10);
      expect(computedCalls.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined dependencies in computed signals', () => {
      const optionalSignal = zen<number | undefined>(undefined);
      const doubled = computed([optionalSignal], (value) => value ? value * 2 : 0);

      expect(get(doubled)).toBe(0); // undefined -> 0
      set(optionalSignal, 5);
      expect(get(doubled)).toBe(10); // 5 -> 10
      set(optionalSignal, undefined);
      expect(get(doubled)).toBe(0); // undefined -> 0
    });

    it('should handle null values correctly', () => {
      const signal = zen<string | null>(null);
      const computedSignal = computed([signal], (value) => value ?? 'default');

      expect(get(computedSignal)).toBe('default');
      set(signal, 'custom');
      expect(get(computedSignal)).toBe('custom');
      set(signal, null);
      expect(get(computedSignal)).toBe('default');
    });

    it('should handle object and array signals', () => {
      const objectSignal = zen({ count: 0 });
      const arraySignal = zen([1, 2, 3]);

      expect(get(objectSignal)).toEqual({ count: 0 });
      expect(get(arraySignal)).toEqual([1, 2, 3]);

      set(objectSignal, { count: 5 });
      set(arraySignal, [4, 5, 6]);

      expect(get(objectSignal)).toEqual({ count: 5 });
      expect(get(arraySignal)).toEqual([4, 5, 6]);
    });
  });

  describe('performance characteristics', () => {
    it('should handle rapid signal updates efficiently', () => {
      const signal = zen(0);
      const mockFn = vi.fn();

      subscribe(signal, mockFn);

      // Perform many rapid updates
      for (let i = 1; i <= 1000; i++) {
        set(signal, i);
      }

      // Should have been called, but the exact number depends on implementation
      expect(mockFn).toHaveBeenCalled();
    });

    it('should handle many computed signals efficiently', () => {
      const base = zen(0);
      const computedSignals = [];

      // Create many computed signals
      for (let i = 0; i < 100; i++) {
        computedSignals.push(computed([base], (value) => value + i));
      }

      // All should compute correctly
      computedSignals.forEach((signal, index) => {
        expect(get(signal)).toBe(index);
      });

      // Update base signal
      set(base, 10);

      // All should update correctly
      computedSignals.forEach((signal, index) => {
        expect(get(signal)).toBe(10 + index);
      });
    });
  });
});