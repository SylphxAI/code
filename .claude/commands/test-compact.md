# Test Compact Command

Test the `/compact` auto-response functionality automatically.

Create a test session with a few messages, run compact, and verify that:
1. Event stream receives all events (assistant-message-created, reasoning-start/delta/end, text-start/delta/end, complete)
2. UI displays the full response (both reasoning and text parts)
3. No duplicate messages
4. No missing events

Report detailed results showing:
- Which events were received
- Final message state in the new session
- Whether test passed or failed
