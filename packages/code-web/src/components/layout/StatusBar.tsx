/**
 * StatusBar Component
 * Bottom status bar showing provider/model, token usage, and connection status
 */

import { currentSession, isStreaming } from '@sylphx/code-client';
import styles from '../../styles/components/statusbar.module.css';

export function StatusBar() {
  const session = currentSession.value;
  const streaming = isStreaming.value;

  const getProviderDisplay = () => {
    if (!session) return 'No session';
    return `${session.provider || 'Unknown'}`;
  };

  const getModelDisplay = () => {
    if (!session) return null;
    return session.model || 'No model';
  };

  const getConnectionStatus = () => {
    if (streaming) return 'streaming';
    if (session) return 'connected';
    return 'disconnected';
  };

  const getTokenUsage = () => {
    // TODO: Get actual token usage from session
    return null;
  };

  const connectionStatus = getConnectionStatus();
  const tokenUsage = getTokenUsage();

  return (
    <footer class={styles.statusBar}>
      <div class={styles.left}>
        <div class={styles.statusItem}>
          <span class={styles.label}>Provider:</span>
          <span class={styles.value}>{getProviderDisplay()}</span>
        </div>
        {getModelDisplay() && (
          <>
            <span class={styles.divider}>•</span>
            <div class={styles.statusItem}>
              <span class={styles.label}>Model:</span>
              <span class={styles.value}>{getModelDisplay()}</span>
            </div>
          </>
        )}
      </div>

      <div class={styles.right}>
        {tokenUsage && (
          <>
            <div class={styles.statusItem}>
              <span class={styles.label}>Tokens:</span>
              <span class={styles.value}>{tokenUsage}</span>
            </div>
            <span class={styles.divider}>•</span>
          </>
        )}
        <div class={`${styles.connectionStatus} ${styles[connectionStatus]}`}>
          <span class={styles.statusIndicator} />
          <span class={styles.statusText}>
            {connectionStatus === 'streaming'
              ? 'Streaming...'
              : connectionStatus === 'connected'
                ? 'Connected'
                : 'Disconnected'}
          </span>
        </div>
      </div>
    </footer>
  );
}
