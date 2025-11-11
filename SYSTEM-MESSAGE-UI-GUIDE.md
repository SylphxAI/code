# System Message UI Display Guide

## Overview

System messages are now stored as structured arrays in `step.systemMessages`, making it easier for UI to display them with appropriate styling and summaries.

## Data Structure

```typescript
interface SystemMessage {
  type: string;      // 'context-warning-80', 'resource-warning-memory', etc.
  content: string;   // Full message content
  timestamp?: number; // When message was triggered
}

interface MessageStep {
  id: string;
  stepIndex: number;
  systemMessages?: SystemMessage[];  // ← Multiple messages possible
  parts: MessagePart[];
  // ...
}
```

## Message Types

### Context Warnings
- `context-warning-80`: Context usage ≥ 80%
- `context-warning-90`: Context usage ≥ 90% (critical)

### Resource Warnings
- `resource-warning-cpu`: CPU usage ≥ 80%
- `resource-warning-memory`: Memory usage ≥ 80%
- `resource-recovered-cpu`: CPU returned to normal
- `resource-recovered-memory`: Memory returned to normal

### Session Messages
- `session-start-todos`: Session start with todo hints

## UI Display Options

### Option 1: Summary Badge (Recommended for between steps)

Show a compact summary between steps:

```
Write(...)

  ⚠️ 2 warnings: Memory 82%, Context 85%

Read(...)
```

Implementation:
```typescript
function renderSystemMessages(messages: SystemMessage[]): JSX.Element {
  if (!messages || messages.length === 0) return null;

  const summaries = messages.map(msg => {
    switch (msg.type) {
      case 'resource-warning-memory':
        return 'Memory 82%';
      case 'context-warning-80':
        return 'Context 85%';
      // ... other types
      default:
        return msg.type;
    }
  });

  return (
    <Badge variant="warning">
      ⚠️ {messages.length} warnings: {summaries.join(', ')}
    </Badge>
  );
}
```

### Option 2: Icon Row (Minimal)

Show just icons:

```
Write(...)

  ⚠️ 💾 📊  [Click to expand]

Read(...)
```

Implementation:
```typescript
function getIconForType(type: string): string {
  if (type.includes('memory')) return '💾';
  if (type.includes('cpu')) return '⚙️';
  if (type.includes('context')) return '📊';
  if (type.includes('recovered')) return '✅';
  return '⚠️';
}

function renderSystemIcons(messages: SystemMessage[]): JSX.Element {
  return (
    <div className="system-icons">
      {messages.map(msg => (
        <span key={msg.type} title={msg.content}>
          {getIconForType(msg.type)}
        </span>
      ))}
    </div>
  );
}
```

### Option 3: Expandable Details (For full content)

Show summary by default, expandable for details:

```
Write(...)

  ⚠️ 2 system messages [▼]
    💾 Memory Warning: 12.8GB/16.0GB (82%)
    📊 Context Warning: 85% of token limit

Read(...)
```

Implementation:
```typescript
function SystemMessageCard({ messages }: { messages: SystemMessage[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!messages || messages.length === 0) return null;

  return (
    <div className="system-message-card">
      <button onClick={() => setExpanded(!expanded)}>
        ⚠️ {messages.length} system messages [{expanded ? '▲' : '▼'}]
      </button>

      {expanded && (
        <div className="message-details">
          {messages.map(msg => (
            <div key={msg.type} className="message-item">
              {getIconForType(msg.type)} {formatSummary(msg)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Option 4: Inline Banner (For important warnings)

Show as a prominent banner:

```
Write(...)

╔════════════════════════════════════════════╗
║ ⚠️ SYSTEM WARNINGS                        ║
║ • Memory usage: 82% (12.8GB/16.0GB)       ║
║ • Context usage: 85% of token limit       ║
╚════════════════════════════════════════════╝

Read(...)
```

## Recommended Implementation

```typescript
function StepSystemMessages({ step }: { step: MessageStep }) {
  const { systemMessages } = step;

  if (!systemMessages || systemMessages.length === 0) {
    return null;
  }

  // Categorize messages
  const warnings = systemMessages.filter(m => m.type.includes('warning'));
  const recoveries = systemMessages.filter(m => m.type.includes('recovered'));
  const others = systemMessages.filter(m =>
    !m.type.includes('warning') && !m.type.includes('recovered')
  );

  return (
    <div className="step-system-messages">
      {/* Show warnings prominently */}
      {warnings.length > 0 && (
        <div className="system-warnings">
          <Badge variant="warning">
            ⚠️ {warnings.length} warning{warnings.length > 1 ? 's' : ''}
          </Badge>
          {warnings.map(msg => (
            <SystemWarningItem key={msg.type} message={msg} />
          ))}
        </div>
      )}

      {/* Show recoveries as success */}
      {recoveries.length > 0 && (
        <div className="system-recoveries">
          <Badge variant="success">
            ✅ {recoveries.length} recovered
          </Badge>
        </div>
      )}

      {/* Show other messages */}
      {others.length > 0 && (
        <div className="system-others">
          {others.map(msg => (
            <SystemMessageItem key={msg.type} message={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

function SystemWarningItem({ message }: { message: SystemMessage }) {
  const summary = getSummaryForType(message.type, message.content);

  return (
    <Tooltip content={message.content}>
      <span className="warning-item">
        {getIconForType(message.type)} {summary}
      </span>
    </Tooltip>
  );
}

function getSummaryForType(type: string, content: string): string {
  // Extract key info from content for display
  if (type === 'resource-warning-memory') {
    const match = content.match(/([\d.]+GB\/[\d.]+GB)/);
    return match ? `Memory ${match[1]}` : 'Memory high';
  }

  if (type === 'context-warning-80') {
    return 'Context 80%';
  }

  if (type === 'context-warning-90') {
    return 'Context 90% (Critical)';
  }

  // ... other types

  return type;
}
```

## Styling Recommendations

```css
.step-system-messages {
  margin: 8px 0;
  padding: 8px 12px;
  background: rgba(255, 193, 7, 0.1);
  border-left: 3px solid #ffc107;
  border-radius: 4px;
}

.system-warnings {
  color: #ff9800;
}

.system-recoveries {
  color: #4caf50;
}

.warning-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 12px;
  font-size: 0.9em;
  margin-right: 8px;
}
```

## Events

Listen for `step-created` event with systemMessages:

```typescript
subscription.subscribe(event => {
  if (event.type === 'step-created') {
    const { stepId, stepNumber, systemMessages } = event;

    // Display system messages immediately
    if (systemMessages && systemMessages.length > 0) {
      showSystemMessages(stepId, systemMessages);
    }
  }
});
```

## Best Practices

1. **Don't show full content inline**: Use summaries or tooltips
2. **Group by severity**: Warnings first, recoveries later
3. **Use icons consistently**: Memory=💾, CPU=⚙️, Context=📊
4. **Make clickable for details**: Users can expand if needed
5. **Fade out recoveries**: After a few seconds, less prominent
6. **Respect user preferences**: Allow hiding/minimizing

## Example Full Flow

```
User sends: "understand this project"

Step 0:
  Write(file1.ts)
  Read(file2.ts)
  [100+ more tool calls...]

[⚠️ 2 warnings: Memory 82%, Context 85%]  ← Shown between steps

Step 1:
  Text: "I notice memory and context are high. Let me summarize..."
  Write(summary.md)

[✅ Memory recovered]  ← Shown when recovered

Step 2:
  Text: "Summary complete. Here are the key findings..."
```
