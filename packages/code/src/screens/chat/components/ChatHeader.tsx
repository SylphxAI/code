/**
 * ChatHeader Component
 * Displays app title and current chat session title
 */

import { Box, Text } from 'ink';

interface ChatHeaderProps {
  currentSessionTitle?: string;
  isTitleStreaming: boolean;
  streamingTitle: string;
}

export function ChatHeader({
  currentSessionTitle,
  isTitleStreaming,
  streamingTitle,
}: ChatHeaderProps) {
  // Priority: streaming title > current title > nothing
  const shouldShowChatTitle = isTitleStreaming || currentSessionTitle;

  return (
    <Box flexDirection="column">
      {/* App Header */}
      <Box paddingX={1} paddingY={1}>
        <Text bold color="#00D9FF">
          SYLPHX FLOW
        </Text>
        <Text dimColor> │ </Text>
        <Text dimColor>AI Development Assistant</Text>
      </Box>

      {/* Chat Title - shows streaming or current title */}
      {shouldShowChatTitle && (
        <Box paddingX={1} paddingBottom={1}>
          <Text color="#00D9FF">▌ CHAT</Text>
          <Text color="#00D9FF"> · </Text>
          <Text color="white">
            {isTitleStreaming ? (streamingTitle || currentSessionTitle || 'New Chat') : (currentSessionTitle || 'New Chat')}
          </Text>
        </Box>
      )}
    </Box>
  );
}
