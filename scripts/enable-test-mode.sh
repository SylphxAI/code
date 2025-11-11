#!/bin/bash
# Enable test mode for system message testing

set -e

DB_PATH="$HOME/.sylphx-code/code.db"

if [ ! -f "$DB_PATH" ]; then
  echo "❌ Database not found at $DB_PATH"
  echo "Please start the app first to create the database."
  exit 1
fi

echo "🧪 Enabling TEST_MODE for system message testing"
echo ""

# Get most recent session
SESSION_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM sessions ORDER BY updated DESC LIMIT 1;")

if [ -z "$SESSION_ID" ]; then
  echo "❌ No sessions found. Please create a session first."
  exit 1
fi

echo "📋 Session ID: $SESSION_ID"

# Get session title
TITLE=$(sqlite3 "$DB_PATH" "SELECT title FROM sessions WHERE id = '$SESSION_ID';")
echo "📝 Title: ${TITLE:-<untitled>}"
echo ""

# Enable mock context
echo "✅ Enabling mock context..."
sqlite3 "$DB_PATH" "
  UPDATE sessions
  SET flags = json_set(COALESCE(flags, '{}'), '$.__mockContext', 1)
  WHERE id = '$SESSION_ID';
"

# Verify
FLAGS=$(sqlite3 "$DB_PATH" "SELECT flags FROM sessions WHERE id = '$SESSION_ID';")
echo "🏁 Flags: $FLAGS"
echo ""

echo "✅ Test mode enabled!"
echo ""
echo "📊 Expected behavior:"
echo "  • Context starts at ~30%"
echo "  • Increases ~8% per message"
echo "  • Test messages at steps 3, 7, 12, 18..."
echo "  • Context warning at 50%"
echo "  • Critical warning at 70%"
echo ""
echo "🚀 Start app with: TEST_MODE=1 npm start"
echo ""
echo "💡 To disable:"
echo "   sqlite3 $DB_PATH \"UPDATE sessions SET flags = json_remove(flags, '$.__mockContext') WHERE id = '$SESSION_ID';\""
