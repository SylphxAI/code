/**
 * Event Bus Tests
 * Tests cross-domain communication through events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventBus, emitSessionEvent, emitAIEvent, emitUIEvent } from './index.js';

describe('Event Bus', () => {
  beforeEach(() => {
    // Clear all event listeners
    eventBus.clear();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('Basic Event Operations', () => {
    it('should subscribe to and emit events', () => {
      const mockCallback = vi.fn();

      // Subscribe to an event
      const unsubscribe = eventBus.on('test-event', mockCallback);

      // Emit the event
      eventBus.emit('test-event', { data: 'test-value' });

      expect(mockCallback).toHaveBeenCalledWith({ data: 'test-value' });

      // Unsubscribe
      unsubscribe();
    });

    it('should handle multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventBus.on('multi-event', callback1);
      eventBus.on('multi-event', callback2);
      eventBus.on('multi-event', callback3);

      eventBus.emit('multi-event', { count: 1 });

      expect(callback1).toHaveBeenCalledWith({ count: 1 });
      expect(callback2).toHaveBeenCalledWith({ count: 1 });
      expect(callback3).toHaveBeenCalledWith({ count: 1 });
    });

    it('should not notify subscribers of different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('event-1', callback1);
      eventBus.on('event-2', callback2);

      eventBus.emit('event-1', { from: 'event1' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should handle unsubscribing correctly', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = eventBus.on('test-event', callback1);
      const unsubscribe2 = eventBus.on('test-event', callback2);

      // Emit to both subscribers
      eventBus.emit('test-event', { value: 1 });
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      // Unsubscribe first callback
      unsubscribe1();

      // Emit again
      eventBus.emit('test-event', { value: 2 });
      expect(callback1).toHaveBeenCalledTimes(1); // No new call
      expect(callback2).toHaveBeenCalledTimes(2); // New call

      // Unsubscribe second callback
      unsubscribe2();

      // Emit again
      eventBus.emit('test-event', { value: 3 });
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('should handle events with no subscribers', () => {
      expect(() => {
        eventBus.emit('no-listeners', { test: true });
      }).not.toThrow();
    });

    it('should handle emitting to non-existent events', () => {
      expect(() => {
        eventBus.emit('non-existent', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Event Data Types', () => {
    it('should handle different data types', () => {
      const stringCallback = vi.fn();
      const numberCallback = vi.fn();
      const objectCallback = vi.fn();
      const arrayCallback = vi.fn();
      const nullCallback = vi.fn();

      eventBus.on('string-event', stringCallback);
      eventBus.on('number-event', numberCallback);
      eventBus.on('object-event', objectCallback);
      eventBus.on('array-event', arrayCallback);
      eventBus.on('null-event', nullCallback);

      eventBus.emit('string-event', 'hello world');
      eventBus.emit('number-event', 42);
      eventBus.emit('object-event', { key: 'value', nested: { data: true } });
      eventBus.emit('array-event', [1, 2, 3, 'four']);
      eventBus.emit('null-event', null);

      expect(stringCallback).toHaveBeenCalledWith('hello world');
      expect(numberCallback).toHaveBeenCalledWith(42);
      expect(objectCallback).toHaveBeenCalledWith({ key: 'value', nested: { data: true } });
      expect(arrayCallback).toHaveBeenCalledWith([1, 2, 3, 'four']);
      expect(nullCallback).toHaveBeenCalledWith(null);
    });

    it('should handle complex nested objects', () => {
      const callback = vi.fn();
      const complexData = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: {
              email: true,
              push: false,
              sms: true
            }
          }
        },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
          features: ['feature1', 'feature2', 'feature3']
        }
      };

      eventBus.on('complex-event', callback);
      eventBus.emit('complex-event', complexData);

      expect(callback).toHaveBeenCalledWith(complexData);
    });

    it('should handle undefined data', () => {
      const callback = vi.fn();

      eventBus.on('undefined-event', callback);
      eventBus.emit('undefined-event', undefined);

      expect(callback).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Off Method', () => {
    it('should remove specific callback using off method', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.on('test-event', callback3);

      // Remove only callback2 using off
      eventBus.off('test-event', callback2);

      eventBus.emit('test-event', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should handle off with non-existent callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('test-event', callback1);

      // Try to remove callback that's not subscribed
      expect(() => {
        eventBus.off('test-event', callback2);
      }).not.toThrow();

      eventBus.emit('test-event', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
    });

    it('should handle off with non-existent event', () => {
      const callback = vi.fn();

      // Try to remove from non-existent event
      expect(() => {
        eventBus.off('non-existent-event', callback);
      }).not.toThrow();
    });
  });

  describe('Clear Method', () => {
    it('should remove all events and listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      eventBus.on('event-1', callback1);
      eventBus.on('event-2', callback2);
      eventBus.on('event-1', callback3);

      // Clear all events
      eventBus.clear();

      // Emit events after clear
      eventBus.emit('event-1', { data: 'test1' });
      eventBus.emit('event-2', { data: 'test2' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });

    it('should allow subscribing after clear', () => {
      const callback = vi.fn();

      // Subscribe, clear, then subscribe again
      eventBus.on('test-event', callback);
      eventBus.clear();
      eventBus.on('test-event', callback);

      eventBus.emit('test-event', { data: 'after-clear' });

      expect(callback).toHaveBeenCalledWith({ data: 'after-clear' });
    });
  });

  describe('Memory Management', () => {
    it('should clean up event sets when empty', () => {
      const callback = vi.fn();

      // Subscribe and immediately unsubscribe
      const unsubscribe = eventBus.on('temp-event', callback);
      unsubscribe();

      // The event should be completely removed from internal storage
      expect(() => {
        eventBus.emit('temp-event', { test: true });
      }).not.toThrow();
    });

    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn());

      // Subscribe many callbacks
      const unsubscribes = callbacks.map(callback =>
        eventBus.on('rapid-event', callback)
      );

      // Emit to all
      eventBus.emit('rapid-event', { cycle: 1 });

      // Unsubscribe all rapidly
      unsubscribes.forEach(unsubscribe => unsubscribe());

      // Emit again - no callbacks should be called
      eventBus.emit('rapid-event', { cycle: 2 });

      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1); // Only from cycle 1
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();

      eventBus.on('error-event', errorCallback);
      eventBus.on('error-event', normalCallback);

      // Emit event that will cause error in first callback
      expect(() => {
        eventBus.emit('error-event', { cause: 'test-error' });
      }).toThrow('Callback error');

      // Second callback should still be called despite error in first
      expect(normalCallback).toHaveBeenCalledWith({ cause: 'test-error' });
      expect(errorCallback).toHaveBeenCalledWith({ cause: 'test-error' });
    });

    it('should handle multiple callback errors', () => {
      const errorCallbacks = Array.from({ length: 3 }, () =>
        vi.fn(() => {
          throw new Error(`Callback error ${Math.random()}`);
        })
      );

      errorCallbacks.forEach(callback =>
        eventBus.on('multiple-errors', callback)
      );

      // Should throw errors but continue to next callbacks
      expect(() => {
        eventBus.emit('multiple-errors', { test: true });
      }).toThrow();

      errorCallbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe('Type-Safe Event Emitters', () => {
    it('should emit session events with correct types', () => {
      const mockCallback = vi.fn();

      eventBus.on('session:started', mockCallback);
      emitSessionEvent('session:started', { sessionId: 'session-123' });

      expect(mockCallback).toHaveBeenCalledWith({ sessionId: 'session-123' });
    });

    it('should emit AI events with correct types', () => {
      const mockCallback = vi.fn();

      eventBus.on('provider:selected', mockCallback);
      emitAIEvent('provider:selected', { providerId: 'openrouter' });

      expect(mockCallback).toHaveBeenCalledWith({ providerId: 'openrouter' });
    });

    it('should emit UI events with correct types', () => {
      const mockCallback = vi.fn();

      eventBus.on('loading:started', mockCallback);
      emitUIEvent('loading:started', { context: 'api-call' });

      expect(mockCallback).toHaveBeenCalledWith({ context: 'api-call' });
    });

    it('should emit complex AI events with correct types', () => {
      const mockCallback = vi.fn();

      eventBus.on('model:selected', mockCallback);
      emitAIEvent('model:selected', {
        providerId: 'anthropic',
        modelId: 'claude-3-sonnet'
      });

      expect(mockCallback).toHaveBeenCalledWith({
        providerId: 'anthropic',
        modelId: 'claude-3-sonnet'
      });
    });

    it('should emit UI navigation events with correct types', () => {
      const mockCallback = vi.fn();

      eventBus.on('navigation:changed', mockCallback);
      emitUIEvent('navigation:changed', {
        from: 'chat',
        to: 'settings'
      });

      expect(mockCallback).toHaveBeenCalledWith({
        from: 'chat',
        to: 'settings'
      });
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency events efficiently', () => {
      const callback = vi.fn();
      eventBus.on('high-frequency', callback);

      const startTime = performance.now();

      // Emit many events rapidly
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('high-frequency', { iteration: i });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(callback).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should handle many concurrent listeners efficiently', () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn());

      // Subscribe many listeners
      callbacks.forEach(callback =>
        eventBus.on('many-listeners', callback)
      );

      const startTime = performance.now();

      // Single event to many listeners
      eventBus.emit('many-listeners', { listeners: 100 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(callbacks.every(callback => callback.mock.calls.length === 1)).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete quickly
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string event names', () => {
      const callback = vi.fn();

      eventBus.on('', callback);
      eventBus.emit('', { data: 'empty-string-event' });

      expect(callback).toHaveBeenCalledWith({ data: 'empty-string-event' });
    });

    it('should handle special characters in event names', () => {
      const callback = vi.fn();

      eventBus.on('special:chars/event.name', callback);
      eventBus.emit('special:chars/event.name', { data: 'special-chars' });

      expect(callback).toHaveBeenCalledWith({ data: 'special-chars' });
    });

    it('should handle very long event names', () => {
      const callback = vi.fn();
      const longEventName = 'a'.repeat(1000);

      eventBus.on(longEventName, callback);
      eventBus.emit(longEventName, { data: 'long-name' });

      expect(callback).toHaveBeenCalledWith({ data: 'long-name' });
    });

    it('should handle the same callback being subscribed multiple times', () => {
      const callback = vi.fn();

      eventBus.on('duplicate-callback', callback);
      eventBus.on('duplicate-callback', callback);
      eventBus.on('duplicate-callback', callback);

      eventBus.emit('duplicate-callback', { data: 'duplicate' });

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should handle unsubscribing same callback multiple times', () => {
      const callback = vi.fn();

      const unsubscribe1 = eventBus.on('multi-unsubscribe', callback);
      const unsubscribe2 = eventBus.on('multi-unsubscribe', callback);

      eventBus.emit('multi-unsubscribe', { data: 'first' });
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe1();
      eventBus.emit('multi-unsubscribe', { data: 'second' });
      expect(callback).toHaveBeenCalledTimes(3);

      unsubscribe1(); // Should not error
      unsubscribe2();
      eventBus.emit('multi-unsubscribe', { data: 'third' });
      expect(callback).toHaveBeenCalledTimes(3); // No new calls
    });
  });
});