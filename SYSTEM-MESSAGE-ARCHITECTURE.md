# System Message Architecture Analysis

## Current Problem

### Issue
- System messages are checked **only once** before streaming starts
- If a user sends "understand this project" → 100+ tool calls
- During those 100 steps, context or resources can become critical
- But LLM won't know until the **next user message**

### Current Flow
```
User Message
  ↓
checkAllTriggers() ← Only checks here
  ↓
Create Assistant Message (step-0)
  ↓
createAIStream() → processStream() → 100+ tool calls
  ↓
Complete step-0
  ↓
Next User Message ← Too late!
```

## Current Architecture

### Single-Step Per Message
- Each assistant message has only **one step** (step-0)
- All streaming (text + 100 tool calls) happens in that single step
- No opportunity to inject system messages mid-stream

### Two Types of Messages
1. **Session Message** (UI layer) - displayed to user, flexible format
2. **Model Message** (AI SDK) - sent to LLM, fixed format (role/content)

## Solution Options

### Option A: Multi-Step Architecture (Recommended)

Transform to true multi-step design (aligned with AI SDK):

```typescript
// Streaming loop with multiple steps
let stepIndex = 0;
let shouldContinue = true;

while (shouldContinue && stepIndex < MAX_STEPS) {
  // 1. Create new step
  const stepId = `${messageId}-step-${stepIndex}`;
  await createMessageStep(db, messageId, stepIndex);

  // 2. Build messages (include all previous steps + system messages)
  const messages = await buildModelMessages(session.messages);

  // 3. Stream this step
  const stream = createAIStream({ model, messages, system });
  const result = await processStream(stream);

  // 4. Save step results
  await updateStepParts(stepId, result.messageParts);
  await completeMessageStep(stepId, {
    status: 'completed',
    usage: result.usage,
    finishReason: result.finishReason
  });

  // 5. Check if should continue
  shouldContinue = result.finishReason === 'tool-calls' && hasMoreWork(result);

  // 6. ⭐ CHECK TRIGGERS BETWEEN STEPS
  if (shouldContinue) {
    // Reload session with updated context
    const updatedSession = await sessionRepository.getSessionById(sessionId);

    // Calculate context usage (accumulate tokens from all messages)
    const contextTokens = calculateContextTokens(updatedSession);

    // Check all triggers
    const triggerResults = await checkAllTriggers(
      updatedSession,
      messageRepository,
      sessionRepository,
      contextTokens
    );

    // Insert system messages if any triggers fired
    for (const triggerResult of triggerResults) {
      await insertSystemMessage(messageRepository, sessionId, triggerResult.message);

      // Emit event for UI
      observer.next({
        type: 'system-message-created',
        messageId: systemMessageId,
        content: triggerResult.message
      });
    }

    // Reload session again to include system messages in next step
    session = await sessionRepository.getSessionById(sessionId);
  }

  stepIndex++;
}
```

#### Pros
- ✅ True multi-step architecture (matches AI SDK design)
- ✅ Can check triggers **between steps**
- ✅ LLM sees system messages in **subsequent steps**
- ✅ Naturally solves long-running task problems
- ✅ Enables advanced agent behaviors (planning, reflection)

#### Cons
- ❌ Requires refactoring streaming.service.ts
- ❌ Need to handle multi-step UI display
- ❌ Increased complexity

#### When to Create New Step
```typescript
function shouldContinueToNextStep(result: StreamResult): boolean {
  // Continue if:
  // 1. Finish reason is tool-calls (LLM wants to continue)
  // 2. Has tool calls that modified state
  // 3. Not just read-only operations

  if (result.finishReason !== 'tool-calls') {
    return false;
  }

  // Check if tools did meaningful work
  const toolParts = result.messageParts.filter(p => p.type === 'tool');
  const hasWrites = toolParts.some(t =>
    ['Write', 'Edit', 'Bash'].includes(t.name)
  );

  return hasWrites;
}
```

### Option B: Mid-Stream Hints (Quick Fix)

Keep current single-step, but add "system hints" during streaming:

```typescript
// Inside processStream()
let toolCallCount = 0;
const CHECK_INTERVAL = 10; // Check every 10 tool calls

for await (const chunk of stream) {
  // ... process chunks

  if (chunk.type === 'tool-call') {
    toolCallCount++;

    // Periodic check during long streams
    if (toolCallCount % CHECK_INTERVAL === 0) {
      // Quick trigger check (simplified, no DB writes)
      const warnings = await quickTriggerCheck(contextTokens, resourceUsage);

      if (warnings.length > 0) {
        // Add system-hint parts (visible to user, NOT to LLM)
        for (const warning of warnings) {
          messageParts.push({
            type: 'system-hint',  // New type
            content: warning.message,
            status: 'completed'
          });

          // Emit event for UI
          observer.next({
            type: 'system-hint',
            content: warning.message
          });
        }
      }
    }
  }
}
```

#### Pros
- ✅ Minimal changes to existing code
- ✅ Can implement immediately
- ✅ User sees warnings in real-time

#### Cons
- ❌ LLM **doesn't see** these hints (stream already in progress)
- ❌ Only for user visibility, doesn't affect LLM behavior
- ❌ Can't inject into model messages
- ❌ Not a real solution, just UX improvement

### Option C: Hybrid Approach

Use both message-level and step-level system messages:

#### Message-Level (existing)
- **When**: Session start, after compact, between user messages
- **Format**: `role='system'` message in database
- **Use cases**:
  - Session start todos
  - Compact summary
  - Initial warnings

#### Step-Level (new - with Option A)
- **When**: Between steps during long streaming
- **Format**: System message inserted before next step
- **Use cases**:
  - Mid-execution context warnings
  - Resource alerts during long tasks
  - Dynamic guidance

```typescript
// Message-level: No step, standalone system message
{
  id: 'msg-system-123',
  role: 'system',
  content: [{ type: 'text', content: 'Session started...', status: 'completed' }],
  timestamp: 12345,
  steps: [],  // No steps for session-level messages
}

// Step-level: Part of assistant message flow
{
  id: 'msg-assistant-456',
  role: 'assistant',
  steps: [
    { stepIndex: 0, parts: [{ type: 'text', content: 'Let me analyze...' }] },
    // System message inserted here as separate message
    { stepIndex: 1, parts: [{ type: 'text', content: 'Continuing...' }] }
  ]
}
```

## Recommendation

### Phase 1: Quick Fix (Option B)
For immediate deployment:
- Add system-hint support in processStream()
- Display to user during long operations
- No LLM awareness, but better UX

### Phase 2: Proper Solution (Option A)
For robust architecture:
- Refactor to multi-step streaming
- Check triggers between steps
- LLM gets system messages in subsequent steps
- Supports advanced agent behaviors

### Phase 3: Hybrid (Option C)
Combine both:
- Message-level for session boundaries
- Step-level for runtime guidance
- Best of both worlds

## Implementation Priority

1. **Immediate** (this week): Option B
   - Add system-hint message part type
   - Periodic trigger checks in processStream()
   - UI display for hints

2. **Short-term** (next sprint): Option A foundation
   - Multi-step loop structure
   - Step boundary trigger checks
   - Basic multi-step UI

3. **Long-term** (next month): Option C polish
   - Optimize trigger logic
   - Advanced step continuati
on rules
   - Performance tuning

## Open Questions

1. **Step Continuation Rules**: When to create new step vs complete?
   - After every tool-calls finish reason?
   - Only after "meaningful" tool calls (writes)?
   - Configurable threshold?

2. **UI Display**: How to show multi-step messages?
   - Collapse all steps into one visual message?
   - Show step boundaries explicitly?
   - Group by reasoning phases?

3. **Context Calculation**: When to calculate tokens?
   - After every step? (expensive)
   - Only when close to limit? (sampling)
   - Cache and invalidate? (complex)

4. **Max Steps**: What's the safety limit?
   - 10 steps? 20 steps?
   - Configurable per agent?
   - Dynamic based on complexity?
