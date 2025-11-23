/**
 * Sidebar Component
 * Navigation sidebar with session list and menu
 */

import { currentScreen, recentSessions, loadRecentSessions } from '@sylphx/code-client';
import { useState, useEffect } from 'preact/hooks';
import type { Screen } from '@sylphx/code-client';
import type { VNode } from 'preact';
import styles from '../../styles/components/sidebar.module.css';

interface NavItem {
  id: Screen;
  label: string;
  icon: () => VNode;
}

const navItems: NavItem[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17H3V10Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'provider',
    label: 'Providers',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M16.2 12C16.1 12.4 16.3 12.8 16.6 13.1L16.7 13.2C17 13.5 17.1 13.9 17.1 14.3C17.1 14.7 17 15.1 16.7 15.4C16.4 15.7 16 15.9 15.6 15.9C15.2 15.9 14.8 15.7 14.5 15.4L14.4 15.3C14.1 15 13.7 14.8 13.3 14.9C12.9 15 12.6 15.3 12.5 15.7V15.9C12.5 16.7 11.8 17.4 11 17.4C10.2 17.4 9.5 16.7 9.5 15.9V15.8C9.4 15.4 9.2 15 8.7 14.9C8.3 14.8 7.9 15 7.6 15.3L7.5 15.4C7.2 15.7 6.8 15.9 6.4 15.9C6 15.9 5.6 15.7 5.3 15.4C5 15.1 4.9 14.7 4.9 14.3C4.9 13.9 5 13.5 5.3 13.2L5.4 13.1C5.7 12.8 5.9 12.4 5.8 12C5.7 11.6 5.4 11.3 5 11.2H4.9C4.1 11.2 3.4 10.5 3.4 9.7C3.4 8.9 4.1 8.2 4.9 8.2H5C5.4 8.1 5.8 7.9 5.9 7.4C6 7 5.8 6.6 5.5 6.3L5.4 6.2C5.1 5.9 4.9 5.5 4.9 5.1C4.9 4.7 5.1 4.3 5.4 4C5.7 3.7 6.1 3.6 6.5 3.6C6.9 3.6 7.3 3.7 7.6 4L7.7 4.1C8 4.4 8.4 4.6 8.8 4.5H9C9.4 4.5 9.7 4.2 9.8 3.8V3.7C9.8 2.9 10.5 2.2 11.3 2.2C12.1 2.2 12.8 2.9 12.8 3.7V3.8C12.9 4.2 13.2 4.5 13.6 4.6C14 4.7 14.4 4.5 14.7 4.2L14.8 4.1C15.1 3.8 15.5 3.6 15.9 3.6C16.3 3.6 16.7 3.8 17 4.1C17.3 4.4 17.5 4.8 17.5 5.2C17.5 5.6 17.3 6 17 6.3L16.9 6.4C16.6 6.7 16.4 7.1 16.5 7.5C16.6 7.9 16.9 8.2 17.3 8.3H17.4C18.2 8.3 18.9 9 18.9 9.8C18.9 10.6 18.2 11.3 17.4 11.3H17.3C16.9 11.4 16.6 11.6 16.5 12H16.2Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Models',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 4H18M2 10H18M2 16H18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'help',
    label: 'Logs',
    icon: () => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 3H17C17.5523 3 18 3.44772 18 4V16C18 16.5523 17.5523 17 17 17H3C2.44772 17 2 16.5523 2 16V4C2 3.44772 2.44772 3 3 3Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M2 8H18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6 3V8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const screen = currentScreen.value;
  const sessions = recentSessions.value.slice(0, 10);

  // Load recent sessions on mount
  useEffect(() => {
    loadRecentSessions(20);
  }, []);

  const handleNavClick = (screenId: Screen) => {
    // TODO: Navigate to screen
    console.log('Navigate to:', screenId);
  };

  const handleNewSession = () => {
    // TODO: Create new session
    console.log('New session clicked');
  };

  const handleSessionClick = (sessionId: string) => {
    // TODO: Switch to session
    console.log('Session clicked:', sessionId);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <button
        class={styles.hamburger}
        onClick={toggleSidebar}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 12H21M3 6H21M3 18H21"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <aside class={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <div class={styles.sidebarHeader}>
          <button class={styles.newSessionButton} onClick={handleNewSession}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 4V16M4 10H16"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        <nav class={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              class={`${styles.navItem} ${screen === item.id ? styles.active : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span class={styles.navIcon}>{item.icon()}</span>
              <span class={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div class={styles.sessions}>
          <h3 class={styles.sessionsTitle}>Recent Sessions</h3>
          <div class={styles.sessionList}>
            {sessions.length === 0 ? (
              <p class={styles.emptyMessage}>No recent sessions</p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  class={styles.sessionItem}
                  onClick={() => handleSessionClick(session.id)}
                >
                  <span class={styles.sessionIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M2 8C2 5.79086 3.79086 4 6 4H10C12.2091 4 14 5.79086 14 8V12H6C3.79086 12 2 10.2091 2 8Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span class={styles.sessionTitle}>{session.title || 'Untitled'}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {!isCollapsed && <div class={styles.overlay} onClick={toggleSidebar} />}
    </>
  );
}
