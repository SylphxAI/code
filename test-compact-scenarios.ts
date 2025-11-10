#!/usr/bin/env tsx
/**
 * Automated Compact Scenario Tests
 * Tests compact summarization quality across different conversation types
 */

import { getTRPCClient } from '@sylphx/code-client';

interface TestScenario {
  name: string;
  messages: string[];
  expectations: {
    hasRecentConversation: boolean;
    hasWorkSummary: boolean;
    hasNextSteps: boolean;
    hasTechnicalDetails: boolean;
  };
}

const scenarios: TestScenario[] = [
  {
    name: 'Simple Greeting',
    messages: ['hi', 'hello there'],
    expectations: {
      hasRecentConversation: true,
      hasWorkSummary: false,
      hasNextSteps: false,
      hasTechnicalDetails: false,
    },
  },
  {
    name: 'Storytelling',
    messages: ['tell me a short story about a robot'],
    expectations: {
      hasRecentConversation: true,
      hasWorkSummary: false,
      hasNextSteps: false,
      hasTechnicalDetails: false,
    },
  },
  {
    name: 'Code Creation',
    messages: [
      'create a function to check if a number is prime',
      'add tests for it',
    ],
    expectations: {
      hasRecentConversation: true,
      hasWorkSummary: true,
      hasNextSteps: false,
      hasTechnicalDetails: true,
    },
  },
  {
    name: 'Ongoing Work',
    messages: [
      'help me debug this error: TypeError: undefined is not a function',
      'it happens when calling processData()',
    ],
    expectations: {
      hasRecentConversation: true,
      hasWorkSummary: true,
      hasNextSteps: true,
      hasTechnicalDetails: true,
    },
  },
];

async function waitForStreamComplete(subscription: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
    subscription.onComplete = () => {
      clearTimeout(timeout);
      resolve();
    };
    subscription.onError = (err: any) => {
      clearTimeout(timeout);
      reject(err);
    };
  });
}

async function runScenario(scenario: TestScenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log('='.repeat(60));

  const client = await getTRPCClient();

  // Step 1: Create session
  console.log('1. Creating session...');
  const session = await client.session.create.mutate({
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    agentId: 'coder',
    enabledRuleIds: [],
  });
  console.log(`   ✓ Session: ${session.id}`);

  // Step 2: Have conversation
  console.log('2. Simulating conversation...');
  for (const message of scenario.messages) {
    console.log(`   User: ${message}`);
    let completed = false;

    const sub = client.message.streamResponse.subscribe(
      {
        sessionId: session.id,
        content: [{ type: 'text', content: message }],
      },
      {
        onData: () => {},
        onComplete: () => { completed = true; },
        onError: (e: any) => {
          console.error('   Error:', e);
          completed = true;
        },
      }
    );

    while (!completed) {
      await new Promise(r => setTimeout(r, 100));
    }
    console.log('   ✓ Response received');
  }

  // Step 3: Compact
  console.log('3. Running compact...');
  const compactResult = await client.session.compact.mutate({
    sessionId: session.id,
  });

  if (!compactResult.success) {
    console.error('   ✗ Compact failed:', compactResult.error);
    return { scenario: scenario.name, passed: false, reason: 'Compact failed' };
  }

  console.log(`   ✓ Compacted to: ${compactResult.newSessionId}`);

  // Step 4: Fetch new session to examine summary
  const newSession = await client.session.getById.query({
    sessionId: compactResult.newSessionId!,
  });

  if (!newSession) {
    console.error('   ✗ Failed to fetch new session');
    return { scenario: scenario.name, passed: false, reason: 'No new session' };
  }

  // Extract summary from system message
  const systemMessage = newSession.messages.find(m => m.role === 'system');
  if (!systemMessage) {
    console.error('   ✗ No system message found');
    return { scenario: scenario.name, passed: false, reason: 'No summary' };
  }

  const summaryContent = systemMessage.content
    .filter(p => p.type === 'text')
    .map(p => (p as any).content)
    .join('\n');

  console.log('\n4. Summary Analysis:');
  console.log('-'.repeat(60));
  console.log(summaryContent);
  console.log('-'.repeat(60));

  // Step 5: Verify expectations
  console.log('\n5. Verification:');
  const results = {
    hasRecentConversation: summaryContent.toLowerCase().includes('conversation') ||
                          summaryContent.toLowerCase().includes('user:') ||
                          summaryContent.toLowerCase().includes('assistant:'),
    hasWorkSummary: summaryContent.toLowerCase().includes('work') ||
                   summaryContent.toLowerCase().includes('completed') ||
                   summaryContent.toLowerCase().includes('implemented'),
    hasNextSteps: summaryContent.toLowerCase().includes('next') ||
                 summaryContent.toLowerCase().includes('pending') ||
                 summaryContent.includes('[ ]'),
    hasTechnicalDetails: summaryContent.includes('function') ||
                        summaryContent.includes('file') ||
                        summaryContent.includes('error') ||
                        summaryContent.includes('TypeError'),
  };

  let passed = true;
  for (const [key, expected] of Object.entries(scenario.expectations)) {
    const actual = results[key as keyof typeof results];
    const match = actual === expected;
    const symbol = match ? '✓' : '✗';
    console.log(`   ${symbol} ${key}: expected ${expected}, got ${actual}`);
    if (!match) passed = false;
  }

  // Step 6: Test continuation
  console.log('\n6. Testing continuation...');
  let continuationWorked = false;
  let aiResponse = '';

  const sub = client.message.streamResponse.subscribe(
    {
      sessionId: compactResult.newSessionId!,
      content: [{ type: 'text', content: 'continue' }],
    },
    {
      onData: (event: any) => {
        if (event.type === 'text-delta') {
          aiResponse += event.text;
        }
      },
      onComplete: () => { continuationWorked = true; },
      onError: (e: any) => {
        console.error('   Error:', e);
        continuationWorked = true;
      },
    }
  );

  while (!continuationWorked) {
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`   AI continued naturally: ${aiResponse.length > 0 ? 'YES' : 'NO'}`);
  console.log(`   Response preview: ${aiResponse.slice(0, 100)}...`);

  return {
    scenario: scenario.name,
    passed,
    summaryLength: summaryContent.length,
    continuationLength: aiResponse.length,
  };
}

async function main() {
  console.log('🧪 Compact Scenario Tests\n');

  const results = [];

  for (const scenario of scenarios) {
    try {
      const result = await runScenario(scenario);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Scenario failed with error:`, error);
      results.push({
        scenario: scenario.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\nResults: ${passed}/${total} scenarios passed\n`);

  results.forEach(r => {
    const symbol = r.passed ? '✅' : '❌';
    console.log(`${symbol} ${r.scenario}`);
    if ('summaryLength' in r) {
      console.log(`   Summary: ${r.summaryLength} chars`);
      console.log(`   Continuation: ${r.continuationLength} chars`);
    }
    if ('error' in r) {
      console.log(`   Error: ${r.error}`);
    }
  });

  process.exit(passed === total ? 0 : 1);
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runScenario };
