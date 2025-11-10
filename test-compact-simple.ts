/**
 * Simple Compact Test
 * 测试 /compact auto-response 完整性
 */

// @ts-nocheck
import('./packages/code/src/index.ts').then(async (app) => {
  console.log('🧪 Compact Test Starting...\n');

  // Import required modules
  const { getTRPCClient } = await import('@sylphx/code-client');
  const client = getTRPCClient();

  try {
    // Step 1: Create test session
    console.log('1️⃣ Creating test session...');
    const session = await client.session.create.mutate({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      agentId: 'coder',
      enabledRuleIds: [],
    });
    console.log(`✓ Session created: ${session.id}\n`);

    // Step 2: Send messages to build history
    console.log('2️⃣ Building message history...');

    // Message 1
    let done = false;
    client.message.streamResponse.subscribe(
      {
        sessionId: session.id,
        content: [{ type: 'text', content: 'List 3 colors' }],
      },
      {
        onData: () => {},
        onComplete: () => { done = true; },
        onError: (e: any) => { console.error(e); done = true; },
      }
    );

    while (!done) await new Promise(r => setTimeout(r, 100));
    console.log('✓ Message 1 complete');

    // Message 2
    done = false;
    client.message.streamResponse.subscribe(
      {
        sessionId: session.id,
        content: [{ type: 'text', content: 'List 3 fruits' }],
      },
      {
        onData: () => {},
        onComplete: () => { done = true; },
        onError: (e: any) => { console.error(e); done = true; },
      }
    );

    while (!done) await new Promise(r => setTimeout(r, 100));
    console.log('✓ Message 2 complete\n');

    // Step 3: Compact
    console.log('3️⃣ Compacting session...');
    const compactResult = await client.session.compact.mutate({
      sessionId: session.id,
    });

    if (!compactResult.success) {
      console.error('❌ Compact failed:', compactResult.error);
      process.exit(1);
    }

    console.log(`✓ Compacted: ${session.id} → ${compactResult.newSessionId}\n`);

    // Step 4: Monitor events
    console.log('4️⃣ Monitoring event stream...\n');

    const events: string[] = [];
    let complete = false;
    const timeout = setTimeout(() => {
      console.log('⏱️ Timeout (30s)');
      complete = true;
    }, 30000);

    client.events.subscribeToSession.subscribe(
      { sessionId: compactResult.newSessionId! },
      {
        onData: (event: any) => {
          console.log(`  📨 ${event.type}`);
          events.push(event.type);
          if (event.type === 'complete') {
            clearTimeout(timeout);
            complete = true;
          }
        },
        onError: (e: any) => {
          console.error('Stream error:', e);
          clearTimeout(timeout);
          complete = true;
        },
      }
    );

    while (!complete) await new Promise(r => setTimeout(r, 100));

    // Step 5: Verify
    console.log('\n📊 Results:\n');

    const hasAssistantMessage = events.includes('assistant-message-created');
    const hasReasoningStart = events.includes('reasoning-start');
    const hasReasoningDelta = events.includes('reasoning-delta');
    const hasReasoningEnd = events.includes('reasoning-end');
    const hasTextStart = events.includes('text-start');
    const hasTextDelta = events.includes('text-delta');
    const hasTextEnd = events.includes('text-end');
    const hasComplete = events.includes('complete');

    console.log(`Assistant Message: ${hasAssistantMessage ? '✅' : '❌'}`);
    console.log(`Reasoning Start:   ${hasReasoningStart ? '✅' : '❌'}`);
    console.log(`Reasoning Delta:   ${hasReasoningDelta ? '✅' : '❌'}`);
    console.log(`Reasoning End:     ${hasReasoningEnd ? '✅' : '❌'}`);
    console.log(`Text Start:        ${hasTextStart ? '✅' : '❌'}`);
    console.log(`Text Delta:        ${hasTextDelta ? '✅' : '❌'}`);
    console.log(`Text End:          ${hasTextEnd ? '✅' : '❌'}`);
    console.log(`Complete:          ${hasComplete ? '✅' : '❌'}`);
    console.log(`\nTotal events: ${events.length}`);

    const isComplete = hasAssistantMessage && hasReasoningStart && hasReasoningDelta &&
                       hasReasoningEnd && hasTextStart && hasTextDelta &&
                       hasTextEnd && hasComplete;

    console.log(`\n${isComplete ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);

    // Check final session state
    const finalSession = await client.session.getById.query({ sessionId: compactResult.newSessionId! });
    if (finalSession) {
      console.log(`\n📝 Final session:`);
      console.log(`  Messages: ${finalSession.messages.length}`);
      finalSession.messages.forEach((msg: any, idx: number) => {
        const parts = msg.content.map((p: any) => `${p.type}(${p.status})`).join(', ');
        console.log(`  [${idx}] ${msg.role} ${msg.status} - [${parts}]`);
      });
    }

    process.exit(isComplete ? 0 : 1);

  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
});
