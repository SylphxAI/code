/**
 * Header Component
 * Top app header with branding, session selector, theme toggle, and settings
 */

import { currentSession, currentSessionTitle } from '@sylphx/code-client';
import { useTheme } from '../../hooks/useTheme';
import styles from '../../styles/components/header.module.css';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const sessionTitle = currentSessionTitle.value;
  const session = currentSession.value;

  const handleSessionClick = () => {
    // TODO: Open session selector dropdown
    console.log('Session selector clicked');
  };

  const handleSettingsClick = () => {
    // TODO: Navigate to settings screen
    console.log('Settings clicked');
  };

  return (
    <header class={styles.header}>
      <div class={styles.left}>
        <h1 class={styles.logo}>SYLPHX CODE</h1>
      </div>

      <div class={styles.center}>
        {session && (
          <button
            class={styles.sessionSelector}
            onClick={handleSessionClick}
            aria-label="Select session"
          >
            <span class={styles.sessionTitle}>{sessionTitle}</span>
            <svg
              class={styles.chevron}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div class={styles.right}>
        <button
          class={styles.iconButton}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 2V4M10 16V18M4 10H2M18 10H16M15.071 15.071L13.657 13.657M15.071 4.929L13.657 6.343M4.929 15.071L6.343 13.657M4.929 4.929L6.343 6.343M14 10C14 12.209 12.209 14 10 14C7.791 14 6 12.209 6 10C6 7.791 7.791 6 10 6C12.209 6 14 7.791 14 10Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 10.95C16.9 11 16.8 11 16.7 11C13.8 11 11.5 8.7 11.5 5.8C11.5 4.4 12 3.1 12.9 2.1C13 2 13 1.9 13 1.8C13 1.7 12.9 1.6 12.8 1.6C11.6 1.2 10.3 1 9 1C4.6 1 1 4.6 1 9C1 13.4 4.6 17 9 17C12.4 17 15.3 14.8 16.5 11.7C16.6 11.5 16.5 11.3 16.3 11.2C16.2 11.1 16.1 11 17 10.95Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          )}
        </button>

        <button
          class={styles.iconButton}
          onClick={handleSettingsClick}
          aria-label="Settings"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
        </button>
      </div>
    </header>
  );
}
