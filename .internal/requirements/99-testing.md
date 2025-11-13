# Testing & Quality Requirements

**Part**: 14 of 14
**Related**: All feature sections

---

## Overall Testing Strategy

### Test Coverage Requirements
- P0 features: 100% coverage (critical path)
- P1 features: 80% coverage (high priority)
- P2 features: 50% coverage (medium priority)
- P3 features: 20% coverage (low priority)

### Test Types
1. **Unit Tests**: Individual functions, pure logic
2. **Integration Tests**: tRPC endpoints, database operations
3. **E2E Tests**: Full user workflows
4. **Multi-Client Tests**: Event synchronization
5. **Performance Tests**: Token calculation speed, event latency

---

## Streaming Tests

### Test Case S1: Normal Streaming

**Related**: [UC1: Normal Streaming](./02-streaming.md#uc1-normal-streaming-user-sends-message)

**Steps**:
1. User sends message "hi"
2. Observe streaming in client

**Expected**:
- Text appears progressively
- Tool calls appear when executed
- Tool results appear when completed
- Final message saved correctly

**Priority**: P0

---

### Test Case S2: Multi-Client Streaming

**Related**: [UC3: Multi-Client Real-Time Sync](./02-streaming.md#uc3-multi-client-real-time-sync)

**Steps**:
1. Open session in 2 clients
2. Send message in Client 1
3. Observe both clients

**Expected**:
- Both clients show streaming simultaneously
- Both clients show identical content
- No desync or missing events

**Priority**: P0

---

### Test Case S3: Resumable Streaming

**Related**: [UC4: Resumable Streaming](./02-streaming.md#uc4-resumable-streaming-join-ongoing-stream)

**Steps**:
1. Start streaming in Client 1
2. Open session in Client 2 mid-stream
3. Observe Client 2

**Expected**:
- Client 2 shows current state
- Client 2 receives remaining events
- No errors or crashes

**Priority**: P1

---

### Test Case S4: Command Auto-Response

**Related**: [UC2: Command with Auto-Response](./02-streaming.md#uc2-command-with-auto-response-compact-with-streaming)

**Steps**:
1. Execute `/compact` command
2. Observe streaming response

**Expected**:
- Command executes successfully
- AI response streams in real-time
- Client shows streaming events
- New session created correctly

**Priority**: P0

---

### Test Case S5: Selective Delivery

**Related**: [UC5: Selective Event Delivery](./02-streaming.md#uc5-selective-event-delivery)

**Steps**:
1. Open Client 1 in session A
2. Open Client 2 in session B
3. Send message in session A
4. Update title in session A

**Expected**:
- Streaming events: Only Client 1 receives
- Title update: Both clients receive
- Client 2 doesn't get session A streaming

**Priority**: P1

---

## Session Management Tests

### Test Case M1: Create and Switch Sessions

**Related**: [UC15-16: Create/Switch Sessions](./03-sessions.md)

**Steps**:
1. Create new session
2. Send message
3. Create another session
4. Switch back to first session

**Expected**:
- Sessions created successfully
- Message history preserved
- Session list shows both sessions
- Switching loads correct history

**Priority**: P0

---

### Test Case M2: Session Compaction

**Related**: [UC18: Compact Session](./03-sessions.md#uc18-compact-session-summarize--continue)

**Steps**:
1. Create session with 10+ messages
2. Execute `/compact`
3. Observe new session

**Expected**:
- Summary generated
- New session created with summary
- AI responds in new session
- Old session preserved

**Priority**: P1

---

## Token Calculation Tests

### Test Case T1: SSOT Compliance

**Related**: [R2.1: SSOT](./07-tokens.md#r21-ssot-single-source-of-truth)

**Steps**:
1. Send message
2. Check StatusBar token count
3. Run `/context` command
4. Compare numbers

**Expected**:
- StatusBar and `/context` show identical numbers
- No discrepancies

**Priority**: P0

---

### Test Case T2: Agent Switch Token Update

**Related**: [UC43: Switch Agent Mid-Session](./07-tokens.md#uc43-switch-agent-mid-session)

**Steps**:
1. Note current token count
2. Switch to different agent
3. Observe token count update

**Expected**:
- Token count updates within 1 second
- New count reflects new agent's prompt
- Multi-client sync works

**Priority**: P0

---

### Test Case T3: Model Switch Token Recalculation

**Related**: [UC44: Switch Model Mid-Session](./07-tokens.md#uc44-switch-model-mid-session)

**Steps**:
1. Create session with messages
2. Note token count
3. Switch to different provider/model
4. Observe token count

**Expected**:
- All historical messages recounted
- New tokenizer applied
- Context limit updated

**Priority**: P0

---

### Test Case T4: Real-Time Token Updates During Streaming

**Related**: [UC46: Real-Time Streaming Token Updates](./07-tokens.md#uc46-real-time-streaming-token-updates)

**Steps**:
1. Send message
2. Observe StatusBar during streaming
3. Note final count after completion

**Expected**:
- StatusBar updates progressively
- Updates smooth (no jarring jumps)
- Final count accurate

**Priority**: P1

---

## Multi-Client Tests

### Test Case MC1: Event Replay

**Related**: [UC78: Event Replay for Late Joiners](./11-multi-client.md#uc78-event-replay-for-late-joiners)

**Steps**:
1. Send message in Client 1
2. Open Client 2 mid-stream
3. Observe Client 2

**Expected**:
- Client 2 receives recent events
- Client 2 reconstructs current state
- Client 2 joins real-time stream

**Priority**: P1

---

### Test Case MC2: Session List Sync

**Related**: [UC80: Session List Sync Edge Cases](./11-multi-client.md#uc80-session-list-sync-edge-cases)

**Steps**:
1. Open Client 1 and Client 2
2. Create session in Client 1
3. Observe Client 2
4. Delete session in Client 1
5. Observe Client 2

**Expected**:
- New session appears in Client 2
- Deleted session removed from Client 2
- No stale data

**Priority**: P1

---

## Performance Requirements

### PR-1: Token Calculation Speed

**Requirement**: Token calculations MUST complete fast enough for real-time UX.

**Targets**:
- StatusBar initial render: < 100ms
- StatusBar update after state change: < 100ms
- `/context` command response: < 200ms
- Streaming delta update: < 50ms

**Why**:
- Anything slower feels laggy
- User workflow interrupted

**User Feedback**:
> "base context can be calculated in real-time, tokenizer is actually fast, because it's native code, WASM"

**Test Method**:
1. Measure token calculation time with benchmark
2. Test with various session sizes (10, 100, 1000 messages)
3. Test with different models/tokenizers
4. Verify p95 latency meets targets

**Priority**: P0

---

### PR-2: Multi-Client Event Latency

**Requirement**: Events MUST propagate to all clients within acceptable time.

**Target**: < 500ms from event publish to client update

**Why**:
- Real-time collaboration feels broken if delayed
- 500ms is perceptible but acceptable

**Test Method**:
1. Send message in Client 1
2. Measure time until Client 2 receives event
3. Test with multiple clients (2, 5, 10)
4. Test across network (localhost vs remote)
5. Verify p95 latency < 500ms

**Priority**: P0

---

### PR-3: Streaming Response Latency

**Requirement**: Streaming text MUST appear with minimal delay.

**Target**: < 100ms from server receive to client display

**Why**:
- Real-time streaming feels broken if delayed
- User perception of system responsiveness

**Test Method**:
1. Mock AI provider to return known text
2. Measure time from server emit to client display
3. Test with various message sizes
4. Verify p95 latency < 100ms

**Priority**: P0

---

### PR-4: File Attachment Performance

**Requirement**: File attachments MUST not block UI.

**Targets**:
- Small files (<1MB): < 200ms to attach
- Medium files (1-5MB): < 1s to attach
- Large files (5-10MB): < 3s to attach

**Why**:
- File attachment is synchronous operation
- User waits for completion before sending

**Test Method**:
1. Create test files of various sizes
2. Measure time to attach and process
3. Test BLOB storage vs base64
4. Verify targets met

**Priority**: P1

---

## Success Metrics

### User Experience Metrics
- **Consistency**: 100% SSOT compliance (StatusBar = /context)
- **Responsiveness**: 95% of operations < 100ms
- **Reliability**: 99.9% uptime
- **User Satisfaction**: No complaints about incorrect data

### Technical Metrics
- **Token Calculation**: p95 < 100ms
- **Event Latency**: p95 < 500ms
- **Multi-Client Sync**: 100% event delivery
- **API Response Time**: p95 < 200ms

---

## Test Environment Setup

### Local Development
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:perf
```

### CI/CD Pipeline
- Run all tests on PR
- Block merge if P0 tests fail
- Generate coverage report
- Performance regression detection

---

## Test Data

### Sample Sessions
- **Empty session**: No messages
- **Small session**: 5 messages
- **Medium session**: 50 messages
- **Large session**: 500 messages
- **Huge session**: 5000 messages (stress test)

### Sample Files
- **Text files**: .md, .txt, .json (various sizes)
- **Code files**: .ts, .js, .py (various sizes)
- **Image files**: .png, .jpg (small, medium, large)
- **Binary files**: .pdf, .zip (edge cases)

---

## Regression Testing

### Critical Paths
1. **Send message → Stream response → Save**
2. **Switch model → Recalculate tokens → Update UI**
3. **Create session → Add messages → Compact**
4. **Multi-client: Send in Client 1 → Receive in Client 2**

### Automated Regression Suite
- Run before every release
- Covers all P0 features
- Includes performance benchmarks
- Fails if any regression detected

---

## Related Sections

- [Streaming](./02-streaming.md) - Streaming test cases (S1-S5)
- [Token Calculation](./07-tokens.md) - Token test cases (T1-T4), performance (PR-1)
- [Multi-Client](./11-multi-client.md) - Multi-client test cases (MC1-MC2), performance (PR-2)
- [Admin & Debug](./13-admin.md) - Health checks, monitoring (UC87)
