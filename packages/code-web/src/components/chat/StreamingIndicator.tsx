/**
 * StreamingIndicator Component
 * Animated typing indicator
 */

import styles from "../../styles/components/chat/streamingindicator.module.css";

export function StreamingIndicator() {
	return (
		<div class={styles.container}>
			<div class={styles.avatar}>
				<span class={styles.avatarIcon}>🤖</span>
			</div>
			<div class={styles.content}>
				<span class={styles.text}>Assistant is typing</span>
				<span class={styles.dots}>
					<span class={styles.dot}>.</span>
					<span class={styles.dot}>.</span>
					<span class={styles.dot}>.</span>
				</span>
			</div>
		</div>
	);
}
