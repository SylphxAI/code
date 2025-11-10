import { getTRPCClient } from '@sylphx/code-client';
import { loadAIConfig } from '@sylphx/code-core';
import chalk from 'chalk';

/**
 * Headless Mode - Execute prompt and stream response
 *
 * Architecture Difference from TUI:
 * - TUI: Uses React hook (useEventStream) for automatic subscription management
 * - Headless: Manually subscribes to events in Promise wrapper
 *
 * Event Flow:
 * 1. Load AI config and validate provider
 * 2. Call triggerStream mutation → Get sessionId
 * 3. Subscribe to session events with replayLast=0 (no replay needed)
 * 4. Print text-delta events to stdout (streaming output)
 * 5. Wait for complete/error event
 * 6. Exit process with appropriate code (0 = success, 1 = error)
 *
 * Error Handling:
 * - No provider configured: Print instructions, exit(1)
 * - Subscription error: Print error, exit(1)
 * - Stream error: Print error event, exit(1)
 * - No output received: Print warning, exit(1)
 *
 * Output:
 * - stdout: AI text output (text-delta events)
 * - stderr: Tool calls, errors, metadata (if --verbose)
 *
 * Usage:
 * ```bash
 * bun dev:code --headless "write a hello world program"
 * bun dev:code --headless "continue" --continue  # Continue last session
 * bun dev:code --headless "fix the bug" --verbose  # Show debug info
 * ```
 */
export async function runHeadless(prompt: string, options: any): Promise<void> {
  try {
    const client = getTRPCClient();

    // Load AI config to get default provider/model
    const configResult = await loadAIConfig();
    if (configResult._tag === 'Failure') {
      console.error(chalk.red('\n✗ Failed to load AI config'));
      console.error(chalk.dim(`Error: ${configResult.error.message}\n`));
      process.exit(1);
    }

    const aiConfig = configResult.value;
    const provider = aiConfig.defaultProvider || 'openrouter';
    const model = aiConfig.providers?.[provider]?.defaultModel || 'x-ai/grok-code-fast-1';

    // Validate provider configuration
    if (!aiConfig.defaultProvider || !aiConfig.providers?.[provider]?.apiKey) {
      console.error(chalk.red('\n✗ No AI provider configured'));
      console.error(chalk.yellow('\nTo use headless mode:'));
      console.error(chalk.dim('  1. Run in TUI mode: bun dev'));
      console.error(chalk.dim('  2. Use /provider command to configure your API key'));
      console.error(chalk.dim('  3. Then try headless mode again\n'));
      process.exit(1);
    }

    // Handle continue mode: load last session
    let sessionId: string | null = null;
    if (options.continue) {
      const lastSession = await client.session.getLast.query();
      if (lastSession) {
        sessionId = lastSession.id;
      }
      // If no last session, will create new one (sessionId stays null)
    }

    // Trigger streaming via mutation
    let hasOutput = false;
    let streamSessionId = sessionId;

    // Parse user input into content parts (similar to TUI)
    const content = [{ type: 'text' as const, content: prompt }];

    // Start streaming in background
    const triggerResult = await client.message.triggerStream.mutate({
      sessionId: streamSessionId,
      provider: sessionId ? undefined : provider,
      model: sessionId ? undefined : model,
      content,
    });

    // Use returned sessionId if lazy session was created
    if (triggerResult.sessionId) {
      streamSessionId = triggerResult.sessionId;
    }

    // Subscribe to session events
    if (!streamSessionId) {
      console.error(chalk.red('\n✗ Failed to get session ID'));
      process.exit(1);
    }

    // Promise to wait for completion
    await new Promise<void>((resolve, reject) => {
      // Subscribe to strongly-typed session events
      client.message.subscribe.subscribe(
        {
          sessionId: streamSessionId,
          replayLast: 0, // No replay needed for headless
        },
        {
          onData: (event: any) => {
            switch (event.type) {
              case 'session-created':
                if (options.verbose) {
                  console.error(chalk.dim(`Session: ${event.sessionId}`));
                }
                break;

              case 'assistant-message-created':
                // Ignore - internal event
                break;

              case 'reasoning-start':
              case 'reasoning-delta':
              case 'reasoning-end':
                // Ignore reasoning events in headless mode
                break;

              case 'text-start':
                // Start of text output
                break;

              case 'text-delta':
                process.stdout.write(event.text);
                hasOutput = true;
                break;

              case 'tool-call':
                if (options.verbose) {
                  console.error(chalk.yellow(`\n[Tool: ${event.toolName}]`));
                }
                break;

              case 'tool-result':
                if (options.verbose) {
                  console.error(
                    chalk.dim(`[Result: ${JSON.stringify(event.result).substring(0, 100)}...]`)
                  );
                }
                break;

              case 'complete':
                if (options.verbose) {
                  console.error(chalk.dim(`\n\n[Complete]`));
                  if (event.usage) {
                    console.error(chalk.dim(`Tokens: ${event.usage.totalTokens || 'N/A'}`));
                  }
                }
                // Resolve and exit
                resolve();
                break;

              case 'error':
                console.error(chalk.red(`\n✗ Error: ${event.error}`));
                reject(new Error(event.error));
                return;
            }
          },
          onError: (err: Error) => {
            console.error(chalk.red(`\n✗ Subscription error: ${err.message}`));
            reject(err);
          },
          onComplete: () => {
            if (!hasOutput) {
              console.error(
                chalk.yellow('\n⚠️  No output received. Model may not support tool calling.')
              );
              reject(new Error('No output received'));
            } else {
              resolve();
            }
          },
        }
      );
    });

    // Exit cleanly after completion
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : String(error));

    if (error instanceof Error && 'statusCode' in error && (error as any).statusCode === 401) {
      console.error(chalk.yellow('\nThis usually means:'));
      console.error(chalk.dim('  • Invalid or missing API key'));
      console.error(chalk.dim('  • API key has expired'));
      console.error(chalk.dim('  • Authentication credentials not found\n'));
      console.error(chalk.green('To fix: Configure your provider settings'));
    }

    if (options.verbose && error instanceof Error) {
      console.error(chalk.dim('\nStack trace:'));
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}
