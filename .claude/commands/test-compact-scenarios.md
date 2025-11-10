# Test Compact Scenarios

Automatically test /compact with different conversation types to verify summaries are complete and continuation works.

Test scenarios:
1. Simple greeting ("hi")
2. Storytelling request
3. Coding task (create a file)
4. Debugging session
5. Tool-heavy conversation
6. Mixed conversation with reasoning

For each scenario:
- Create test session
- Have conversation
- Run /compact
- Verify summary quality
- Test if continuation works naturally

Report:
- Summary completeness (all parts preserved?)
- Continuation naturalness
- Any missing context
