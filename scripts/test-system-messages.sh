#!/bin/bash
# Complete test workflow for system messages

set -e

DB_PATH="$HOME/.sylphx-code/code.db"

echo "🧪 System Message Testing Workflow"
echo "=================================="
echo ""

# Step 1: Check database
if [ ! -f "$DB_PATH" ]; then
  echo "❌ Database not found. Please start the app first."
  exit 1
fi

# Step 2: Get or create test session
echo "Step 1: Finding session..."
SESSION_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM sessions ORDER BY updated DESC LIMIT 1;")

if [ -z "$SESSION_ID" ]; then
  echo "❌ No sessions found. Please start the app and create a session."
  exit 1
fi

TITLE=$(sqlite3 "$DB_PATH" "SELECT title FROM sessions WHERE id = '$SESSION_ID';")
echo "✅ Using session: ${TITLE:-<untitled>} ($SESSION_ID)"
echo ""

# Step 3: Enable test mode
echo "Step 2: Enabling test mode..."
sqlite3 "$DB_PATH" "
  UPDATE sessions
  SET flags = json_set(COALESCE(flags, '{}'), '$.__mockContext', 1)
  WHERE id = '$SESSION_ID';
"
echo "✅ Mock context enabled"
echo ""

# Step 4: Show current state
echo "Step 3: Current state..."
MESSAGE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM messages WHERE session_id = '$SESSION_ID';")
ASSISTANT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM messages WHERE session_id = '$SESSION_ID' AND role = 'assistant';")
echo "  Messages: $MESSAGE_COUNT (Assistant: $ASSISTANT_COUNT)"

# Check for existing system messages
SYSTEM_MSG_COUNT=$(sqlite3 "$DB_PATH" "
  SELECT COUNT(*)
  FROM message_steps
  WHERE message_id IN (SELECT id FROM messages WHERE session_id = '$SESSION_ID')
    AND system_messages IS NOT NULL;
")
echo "  Steps with system messages: $SYSTEM_MSG_COUNT"
echo ""

# Step 5: Predict next triggers
echo "Step 4: Predicted triggers..."
NEXT_STEP=$((ASSISTANT_COUNT + 1))

# Test trigger steps: 3, 7, 12, 18, 25, 33
TEST_TRIGGERS=(3 7 12 18 25 33)
NEXT_TEST=""
for step in "${TEST_TRIGGERS[@]}"; do
  if [ $step -gt $ASSISTANT_COUNT ]; then
    NEXT_TEST=$step
    break
  fi
done

if [ -n "$NEXT_TEST" ]; then
  echo "  🧪 Next test trigger: Step $NEXT_TEST (in $((NEXT_TEST - ASSISTANT_COUNT)) messages)"
fi

# Calculate mock context
BASE=30
INCREASE=8
CURRENT_USAGE=$((BASE + ASSISTANT_COUNT * INCREASE))
echo "  📊 Current context (mocked): ~${CURRENT_USAGE}%"

if [ $CURRENT_USAGE -lt 50 ]; then
  MSGS_TO_50=$(((50 - BASE) / INCREASE))
  echo "  ⚠️  Context warning at: Message $MSGS_TO_50 (~50%)"
else
  echo "  ⚠️  Context warning: ALREADY TRIGGERED"
fi

if [ $CURRENT_USAGE -lt 70 ]; then
  MSGS_TO_70=$(((70 - BASE) / INCREASE))
  echo "  🚨 Critical warning at: Message $MSGS_TO_70 (~70%)"
else
  echo "  🚨 Critical warning: ALREADY TRIGGERED"
fi

echo ""

# Step 6: Instructions
echo "Step 5: Next actions..."
echo "  1. Start app: TEST_MODE=1 npm start"
echo "  2. Continue this session"
echo "  3. Send any message"
echo "  4. Watch for system messages in UI and logs"
echo ""

echo "📝 Monitor logs for:"
echo "  • 🧪 [mockContextTokens] Message X: Y%"
echo "  • [TriggerRegistry] Trigger fired: ..."
echo "  • 🔄 [onPrepareMessages] Created step-X with N system messages"
echo ""

echo "🔍 Verify in database:"
echo "  sqlite3 $DB_PATH \"SELECT step_index, system_messages FROM message_steps WHERE system_messages IS NOT NULL ORDER BY id DESC LIMIT 3;\""
echo ""

echo "✅ Ready to test!"
