/**
 * Automated Compact Test
 * Tests /compact auto-response functionality
 */

import { getTRPCClient } from './packages/code/src/trpc-client.js';
import type { StreamEvent } from './packages/code-server/src/types/stream-events.js';

interface EventLog {
  type: string;
  timestamp: number;
  messageId?: string;
  sessionId?: string;
}

async function testCompact() {
  console.log('🧪 Starting compact auto-test...\n');

  try {
    const client = await getTRPCClient();
    const receivedEvents: EventLog[] = [];

    // Step 1: Create session
    console.log('📝 Step 1: Creating test session...');
    const session = await client.session.create.mutate({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      agentId: 'coder',
      enabledRuleIds: [],
    });
    console.log(`✓ Created session: ${session.id}\n`);

    // Step 2: Send a few messages to create history
    console.log('📝 Step 2: Sending test messages...');

    // Message 1
    let streamCompleted = false;
    let messageId1: string | null = null;

    const sub1 = client.message.streamResponse.subscribe(
      {
        sessionId: session.id,
        content: [{ type: 'text', content: 'What is 2+2?' }],
      },
      {
        onData: (event: StreamEvent) => {
          if (event.type === 'assistant-message-created') {
            messageId1 = event.messageId;
          }
        },
        onComplete: () => {
          streamCompleted = true;
        },
        onError: (err) => {
          console.error('Stream error:', err);
          streamCompleted = true;
        },
      }
    );

    // Wait for completion
    while (!streamCompleted) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('✓ Message 1 completed\n');

    // Message 2
    streamCompleted = false;
    const sub2 = client.message.streamResponse.subscribe(
      {
        sessionId: session.id,
        content: [{ type: 'text', content: 'What is 3+3?' }],
      },
      {
        onData: (event: StreamEvent) => {},
        onComplete: () => {
          streamCompleted = true;
        },
        onError: (err) => {
          console.error('Stream error:', err);
          streamCompleted = true;
        },
      }
    );

    while (!streamCompleted) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('✓ Message 2 completed\n');

    // Step 3: Compact session
    console.log('📝 Step 3: Compacting session...');
    const compactResult = await client.session.compact.mutate({
      sessionId: session.id,
    });

    if (!compactResult.success) {
      console.error('❌ Compact failed:', compactResult.error);
      return;
    }

    console.log(`✓ Compacted session: ${session.id} → ${compactResult.newSessionId}\n`);

    // Step 4: Monitor event stream for new session
    console.log('📝 Step 4: Monitoring event stream for auto-response...\n');

    let autoResponseStarted = false;
    let autoResponseCompleted = false;
    let assistantMessageId: string | null = null;
    let hasReasoningStart = false;
    let hasReasoningDelta = false;
    let hasReasoningEnd = false;
    let hasTextStart = false;
    let hasTextDelta = false;
    let hasTextEnd = false;
    let hasComplete = false;

    const timeout = setTimeout(() => {
      console.log('⏱️ Timeout waiting for events');
      autoResponseCompleted = true;
    }, 30000); // 30 second timeout

    const eventSub = client.events.subscribeToSession.subscribe(
      { sessionId: compactResult.newSessionId! },
      {
        onData: (event: StreamEvent) => {
          receivedEvents.push({
            type: event.type,
            timestamp: Date.now(),
            messageId: 'messageId' in event ? (event as any).messageId : undefined,
            sessionId: 'sessionId' in event ? (event as any).sessionId : undefined,
          });

          console.log(`  📨 ${event.type}`);

          // Track event types
          if (event.type === 'assistant-message-created') {
            assistantMessageId = event.messageId;
            autoResponseStarted = true;
          } else if (event.type === 'reasoning-start') {
            hasReasoningStart = true;
          } else if (event.type === 'reasoning-delta') {
            hasReasoningDelta = true;
          } else if (event.type === 'reasoning-end') {
            hasReasoningEnd = true;
          } else if (event.type === 'text-start') {
            hasTextStart = true;
          } else if (event.type === 'text-delta') {
            hasTextDelta = true;
          } else if (event.type === 'text-end') {
            hasTextEnd = true;
          } else if (event.type === 'complete') {
            hasComplete = true;
            autoResponseCompleted = true;
            clearTimeout(timeout);
          }
        },
        onError: (err) => {
          console.error('Event stream error:', err);
          autoResponseCompleted = true;
          clearTimeout(timeout);
        },
        onComplete: () => {
          console.log('Event stream completed');
        },
      }
    );

    // Wait for completion or timeout
    while (!autoResponseCompleted) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    eventSub.unsubscribe();

    // Step 5: Verify results
    console.log('\n📊 Test Results:\n');
    console.log(`Auto-response started: ${autoResponseStarted ? '✅' : '❌'}`);
    console.log(`Assistant message ID: ${assistantMessageId || 'N/A'}`);
    console.log(`\nEvent Sequence:`);
    console.log(`  Reasoning Start: ${hasReasoningStart ? '✅' : '❌'}`);
    console.log(`  Reasoning Delta: ${hasReasoningDelta ? '✅' : '❌'}`);
    console.log(`  Reasoning End: ${hasReasoningEnd ? '✅' : '❌'}`);
    console.log(`  Text Start: ${hasTextStart ? '✅' : '❌'}`);
    console.log(`  Text Delta: ${hasTextDelta ? '✅' : '❌'}`);
    console.log(`  Text End: ${hasTextEnd ? '✅' : '❌'}`);
    console.log(`  Complete: ${hasComplete ? '✅' : '❌'}`);

    console.log(`\nTotal events received: ${receivedEvents.length}`);

    // Check completeness
    const isComplete =
      autoResponseStarted &&
      hasReasoningStart &&
      hasReasoningDelta &&
      hasReasoningEnd &&
      hasTextStart &&
      hasTextDelta &&
      hasTextEnd &&
      hasComplete;

    console.log(`\n${isComplete ? '✅ TEST PASSED' : '❌ TEST FAILED'}: Compact auto-response ${isComplete ? 'complete' : 'incomplete'}`);

    // Fetch final session state
    const finalSession = await client.session.getById.query({ sessionId: compactResult.newSessionId! });
    if (finalSession) {
      console.log(`\nFinal session state:`);
      console.log(`  Messages: ${finalSession.messages.length}`);
      finalSession.messages.forEach((msg, idx) => {
        const contentSummary = msg.content.map(p => `${p.type}(${p.status})`).join(', ');
        console.log(`  [${idx}] ${msg.role} - ${msg.status} - [${contentSummary}]`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }

  console.log('\n🧪 Test completed\n');
  process.exit(0);
}

testCompact();
