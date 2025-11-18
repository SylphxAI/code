/**
 * MarkdownRenderer Component
 * Renders markdown with syntax highlighting
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";
import styles from "../../styles/components/markdown/markdown.module.css";

interface MarkdownRendererProps {
	content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
	return (
		<div class={styles.markdown}>
			{/* @ts-ignore - react-markdown works with Preact via preact/compat */}
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					// @ts-ignore - Preact/React compat
					code: ({ node, inline, className, children, ...props }: any) => {
						const match = /language-(\w+)/.exec(className || "");
						const language = match ? match[1] : "";
						const code = String(children).replace(/\n$/, "");

						if (!inline && language) {
							return (
								// @ts-ignore - Preact/React compat
								<Highlight
									theme={themes.vsDark}
									code={code}
									language={language}
								>
									{({ style, tokens, getLineProps, getTokenProps }) => (
										<pre
											class={styles.codeBlock}
											// @ts-ignore - Preact/React compat
											style={style}
										>
											{tokens.map((line, i) => (
												// @ts-ignore - Preact/React compat
												<div {...getLineProps({ line })} key={i}>
													{line.map((token, key) => (
														// @ts-ignore - Preact/React compat
														<span {...getTokenProps({ token })} key={key} />
													))}
												</div>
											))}
										</pre>
									)}
								</Highlight>
							);
						}

						return (
							<code class={styles.inlineCode} {...props}>
								{children}
							</code>
						);
					},
					// @ts-ignore - Preact/React compat
					a: ({ node, children, ...props }: any) => {
						return (
							<a {...props} target="_blank" rel="noopener noreferrer">
								{children}
							</a>
						);
					},
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
