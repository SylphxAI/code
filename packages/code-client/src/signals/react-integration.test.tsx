/**
 * React Integration Tests
 * Tests Zen signals integration with React components
 */

import React, { useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useStore } from '@sylphx/zen-react';
import { zen, computed, get, set } from '@sylphx/zen';
import * as ui from './domain/ui/index.ts';
import * as ai from './domain/ai/index.ts';

// Test components for signal integration
const TestComponent = ({ onSignalChange }: { onSignalChange?: (value: any) => void }) => {
  const currentScreen = useStore(ui.$currentScreen);
  const isLoading = useStore(ui.$isLoading);

  useEffect(() => {
    onSignalChange?.({ currentScreen, isLoading });
  }, [currentScreen, isLoading, onSignalChange]);

  return (
    <div>
      <div data-testid="current-screen">{currentScreen}</div>
      <div data-testid="loading">{isLoading ? 'Loading...' : 'Ready'}</div>
    </div>
  );
};

const ComputedTestComponent = ({ onComputedChange }: { onComputedChange?: (value: any) => void }) => {
  const canGoBack = useStore(ui.$canGoBack);
  const showNavigation = useStore(ui.$showNavigation);

  useEffect(() => {
    onComputedChange?.({ canGoBack, showNavigation });
  }, [canGoBack, showNavigation, onComputedChange]);

  return (
    <div>
      <div data-testid="can-go-back">{canGoBack ? 'Yes' : 'No'}</div>
      <div data-testid="show-nav">{showNavigation ? 'Shown' : 'Hidden'}</div>
    </div>
  );
};

const AIConfigComponent = ({ onConfigChange }: { onConfigChange?: (value: any) => void }) => {
  const config = useStore(ai.$aiConfig);
  const selectedProvider = useStore(ai.$selectedProvider);
  const hasConfig = useStore(ai.$hasConfig);

  useEffect(() => {
    onConfigChange?.({ config, selectedProvider, hasConfig });
  }, [config, selectedProvider, hasConfig, onConfigChange]);

  return (
    <div>
      <div data-testid="selected-provider">{selectedProvider || 'None'}</div>
      <div data-testid="has-config">{hasConfig ? 'Yes' : 'No'}</div>
    </div>
  );
};

describe('React Integration with Zen Signals', () => {
  beforeEach(() => {
    // Reset all signals to initial state
    ui.navigateTo('chat');
    ui.setLoading(false);
    ui.setError(null);
    ai.setAIConfig(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Signal Integration', () => {
    it('should render with initial signal values', () => {
      render(<TestComponent />);

      expect(screen.getByTestId('current-screen')).toHaveTextContent('chat');
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    it('should re-render when signal values change', () => {
      const mockOnSignalChange = vi.fn();
      render(<TestComponent onSignalChange={mockOnSignalChange} />);

      // Initial render
      expect(mockOnSignalChange).toHaveBeenCalledWith({
        currentScreen: 'chat',
        isLoading: false
      });

      act(() => {
        ui.navigateTo('settings');
      });

      expect(screen.getByTestId('current-screen')).toHaveTextContent('settings');
      expect(mockOnSignalChange).toHaveBeenCalledWith({
        currentScreen: 'settings',
        isLoading: false
      });
    });

    it('should handle multiple signal changes', () => {
      render(<TestComponent />);

      act(() => {
        ui.navigateTo('provider');
      });

      act(() => {
        ui.setLoading(true);
      });

      expect(screen.getByTestId('current-screen')).toHaveTextContent('provider');
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
    });

    it('should handle signal updates in component unmount', () => {
      const { unmount } = render(<TestComponent />);

      act(() => {
        ui.navigateTo('settings');
      });

      unmount();

      // Should not throw errors when updating signals after unmount
      expect(() => {
        ui.navigateTo('chat');
      }).not.toThrow();
    });
  });

  describe('Computed Signal Integration', () => {
    it('should render computed signal values', () => {
      render(<ComputedTestComponent />);

      expect(screen.getByTestId('can-go-back')).toHaveTextContent('No');
      expect(screen.getByTestId('show-nav')).toHaveTextContent('Shown');
    });

    it('should re-render when computed dependencies change', () => {
      const mockOnComputedChange = vi.fn();
      render(<ComputedTestComponent onComputedChange={mockOnComputedChange} />);

      // Initial state
      expect(mockOnComputedChange).toHaveBeenCalledWith({
        canGoBack: false,
        showNavigation: true
      });

      act(() => {
        ui.navigateTo('settings');
      });

      // After navigation, computed values should update
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('Yes');
      expect(mockOnComputedChange).toHaveBeenCalledWith({
        canGoBack: true,
        showNavigation: true
      });

      act(() => {
        ui.navigateTo('provider');
      });

      expect(screen.getByTestId('can-go-back')).toHaveTextContent('Yes');
      expect(screen.getByTestId('show-nav')).toHaveTextContent('Hidden');
    });

    it('should handle complex computed signal chains', () => {
      // Create a custom signal and computed signal for testing
      const customSignal = zen(1);
      const customComputed = computed([customSignal], (value) => value * 2);

      const CustomComponent = () => {
        const value = useStore(customComputed);
        return <div data-testid="custom-value">{value}</div>;
      };

      const { rerender } = render(<CustomComponent />);
      expect(screen.getByTestId('custom-value')).toHaveTextContent('2');

      act(() => {
        set(customSignal, 5);
      });

      expect(screen.getByTestId('custom-value')).toHaveTextContent('10');
    });
  });

  describe('AI Config Signal Integration', () => {
    it('should render AI config signals correctly', () => {
      render(<AIConfigComponent />);

      expect(screen.getByTestId('selected-provider')).toHaveTextContent('None');
      expect(screen.getByTestId('has-config')).toHaveTextContent('No');
    });

    it('should update when AI config changes', () => {
      const mockOnConfigChange = vi.fn();
      render(<AIConfigComponent onConfigChange={mockOnConfigChange} />);

      const mockConfig = {
        defaultProvider: 'openrouter',
        providers: {
          openrouter: {
            defaultModel: 'claude-3',
            apiKey: 'test-key'
          }
        }
      } as any;

      act(() => {
        ai.setAIConfig(mockConfig);
      });

      expect(screen.getByTestId('selected-provider')).toHaveTextContent('openrouter');
      expect(screen.getByTestId('has-config')).toHaveTextContent('Yes');

      expect(mockOnConfigChange).toHaveBeenCalledWith({
        config: mockConfig,
        selectedProvider: 'openrouter',
        hasConfig: true
      });
    });
  });

  describe('Multiple Components with Same Signals', () => {
    it('should sync updates across multiple components', () => {
      const Component1 = () => {
        const screen = useStore(ui.$currentScreen);
        return <div data-testid="comp1-screen">{screen}</div>;
      };

      const Component2 = () => {
        const screen = useStore(ui.$currentScreen);
        return <div data-testid="comp2-screen">{screen}</div>;
      };

      render(
        <div>
          <Component1 />
          <Component2 />
        </div>
      );

      expect(screen.getByTestId('comp1-screen')).toHaveTextContent('chat');
      expect(screen.getByTestId('comp2-screen')).toHaveTextContent('chat');

      act(() => {
        ui.navigateTo('provider');
      });

      expect(screen.getByTestId('comp1-screen')).toHaveTextContent('provider');
      expect(screen.getByTestId('comp2-screen')).toHaveTextContent('provider');
    });

    it('should handle component-specific state correctly', () => {
      const ComponentWithLocalState = () => {
        const screen = useStore(ui.$currentScreen);
        const [localCount, setLocalCount] = React.useState(0);

        return (
          <div>
            <div data-testid="screen">{screen}</div>
            <div data-testid="count">{localCount}</div>
            <button onClick={() => setLocalCount(localCount + 1)}>Increment</button>
          </div>
        );
      };

      render(<ComponentWithLocalState />);

      expect(screen.getByTestId('screen')).toHaveTextContent('chat');
      expect(screen.getByTestId('count')).toHaveTextContent('0');

      // Change local state
      screen.getByText('Increment').click();
      expect(screen.getByTestId('count')).toHaveTextContent('1');
      expect(screen.getByTestId('screen')).toHaveTextContent('chat');

      // Change signal state
      act(() => {
        ui.navigateTo('settings');
      });

      expect(screen.getByTestId('screen')).toHaveTextContent('settings');
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderCount = vi.fn();

      const OptimizedComponent = () => {
        const screen = useStore(ui.$currentScreen);
        renderCount();
        return <div data-testid="screen">{screen}</div>;
      };

      render(<OptimizedComponent />);

      // Initial render
      expect(renderCount).toHaveBeenCalledTimes(1);

      // Update different signal (should not re-render)
      act(() => {
        ui.setLoading(true);
      });

      expect(renderCount).toHaveBeenCalledTimes(1);

      // Update relevant signal (should re-render)
      act(() => {
        ui.navigateTo('settings');
      });

      expect(renderCount).toHaveBeenCalledTimes(2);
    });

    it('should handle signal subscriptions correctly', () => {
      const subscriptionCount = vi.fn();
      const customSignal = zen(0);

      const SubscriptionComponent = () => {
        const value = useStore(customSignal);

        React.useEffect(() => {
          subscriptionCount();
        }, [value]);

        return <div data-testid="value">{value}</div>;
      };

      const { unmount } = render(<SubscriptionComponent />);

      // Initial setup
      expect(subscriptionCount).toHaveBeenCalledTimes(1);

      // Update signal
      act(() => {
        set(customSignal, 1);
      });

      expect(subscriptionCount).toHaveBeenCalledTimes(2);

      // Unmount component
      unmount();

      // Update signal after unmount (should not cause issues)
      act(() => {
        set(customSignal, 2);
      });

      // Should not have called subscription again after unmount
      expect(subscriptionCount).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle signal errors gracefully', () => {
      // This tests error boundaries and signal error handling
      const ErrorComponent = () => {
        const screen = useStore(ui.$currentScreen);

        if (screen === 'error-screen') {
          throw new Error('Test error');
        }

        return <div data-testid="screen">{screen}</div>;
      };

      const { rerender } = render(<ErrorComponent />);
      expect(screen.getByTestId('screen')).toHaveTextContent('chat');

      // Navigate to error screen should cause component to error
      expect(() => {
        act(() => {
          ui.navigateTo('error-screen' as any);
        });
      }).toThrow('Test error');

      // Should be able to recover by changing signal
      act(() => {
        ui.navigateTo('chat');
      });
    });

    it('should handle computed signal errors', () => {
      const errorSignal = zen(0);
      const errorComputed = computed([errorSignal], () => {
        throw new Error('Computed error');
      });

      const ErrorComputedComponent = () => {
        try {
          const value = useStore(errorComputed);
          return <div data-testid="value">{value}</div>;
        } catch (error) {
          return <div data-testid="error">Error occurred</div>;
        }
      };

      render(<ErrorComputedComponent />);
      expect(screen.getByTestId('error')).toHaveTextContent('Error occurred');
    });
  });
});