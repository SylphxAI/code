import { describe, expect, it } from "vitest";
import { InlineActionParser } from "./inline-action-parser.js";
import type { InlineAction } from "./inline-action-types.js";

describe("InlineActionParser", () => {
	describe("basic parsing", () => {
		it("should parse simple message tag", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("<message>Hello world</message>");

			expect(actions).toContainEqual({ type: "message-start" });
			expect(actions).toContainEqual({ type: "message-end" });

			// Check deltas contain the content
			const deltas = actions.filter((a) => a.type === "message-delta");
			const content = deltas.map((a) => (a as any).content).join("");
			expect(content).toBe("Hello world");
		});

		it("should parse simple title tag", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("<title>My Title</title>");

			expect(actions).toContainEqual({ type: "title-start" });
			expect(actions).toContainEqual({ type: "title-end" });

			const deltas = actions.filter((a) => a.type === "title-delta");
			const content = deltas.map((a) => (a as any).content).join("");
			expect(content).toBe("My Title");
		});

		it("should parse suggestions with multiple items", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed(
				"<suggestions><s>Option A</s><s>Option B</s></suggestions>",
			);

			expect(actions).toContainEqual({ type: "suggestions-start" });
			expect(actions).toContainEqual({ type: "suggestions-end" });
			expect(actions).toContainEqual({ type: "suggestion-start", index: 0 });
			expect(actions).toContainEqual({ type: "suggestion-end", index: 0 });
			expect(actions).toContainEqual({ type: "suggestion-start", index: 1 });
			expect(actions).toContainEqual({ type: "suggestion-end", index: 1 });

			const deltas0 = actions.filter(
				(a) => a.type === "suggestion-delta" && (a as any).index === 0,
			);
			const deltas1 = actions.filter(
				(a) => a.type === "suggestion-delta" && (a as any).index === 1,
			);

			expect(deltas0.map((a) => (a as any).content).join("")).toBe("Option A");
			expect(deltas1.map((a) => (a as any).content).join("")).toBe("Option B");
		});
	});

	describe("streaming chunks", () => {
		it("should handle content split across chunks", () => {
			const parser = new InlineActionParser();
			const allActions: InlineAction[] = [];

			// Simulate streaming chunks
			allActions.push(...parser.feed("<mes"));
			allActions.push(...parser.feed("sage>Hel"));
			allActions.push(...parser.feed("lo</mes"));
			allActions.push(...parser.feed("sage>"));

			expect(allActions).toContainEqual({ type: "message-start" });
			expect(allActions).toContainEqual({ type: "message-end" });

			const deltas = allActions.filter((a) => a.type === "message-delta");
			const content = deltas.map((a) => (a as any).content).join("");
			expect(content).toBe("Hello");
		});

		it("should handle tag split across chunks", () => {
			const parser = new InlineActionParser();
			const allActions: InlineAction[] = [];

			allActions.push(...parser.feed("<"));
			allActions.push(...parser.feed("title"));
			allActions.push(...parser.feed(">New"));
			allActions.push(...parser.feed(" Title</title>"));

			expect(allActions).toContainEqual({ type: "title-start" });
			expect(allActions).toContainEqual({ type: "title-end" });

			const deltas = allActions.filter((a) => a.type === "title-delta");
			const content = deltas.map((a) => (a as any).content).join("");
			expect(content).toBe("New Title");
		});
	});

	describe("mixed content", () => {
		it("should parse message followed by title", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed(
				"<message>Hello</message><title>Chat</title>",
			);

			const messageDeltas = actions.filter((a) => a.type === "message-delta");
			const titleDeltas = actions.filter((a) => a.type === "title-delta");

			expect(messageDeltas.map((a) => (a as any).content).join("")).toBe(
				"Hello",
			);
			expect(titleDeltas.map((a) => (a as any).content).join("")).toBe("Chat");
		});

		it("should parse all three tag types", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed(
				"<message>Content here</message><title>My Session</title><suggestions><s>Do this</s><s>Do that</s></suggestions>",
			);

			expect(actions.filter((a) => a.type === "message-start")).toHaveLength(1);
			expect(actions.filter((a) => a.type === "title-start")).toHaveLength(1);
			expect(actions.filter((a) => a.type === "suggestions-start")).toHaveLength(
				1,
			);
			expect(actions.filter((a) => a.type === "suggestion-start")).toHaveLength(
				2,
			);
		});
	});

	describe("plain text handling", () => {
		it("should emit text-delta for content outside tags", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("Hello world");

			const textDeltas = actions.filter((a) => a.type === "text-delta");
			const content = textDeltas.map((a) => (a as any).content).join("");
			expect(content).toBe("Hello world");
		});

		it("should handle text before and after tags", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("Before<message>Inside</message>After");

			const textDeltas = actions.filter((a) => a.type === "text-delta");
			const messageDeltas = actions.filter((a) => a.type === "message-delta");

			expect(textDeltas.map((a) => (a as any).content).join("")).toBe(
				"BeforeAfter",
			);
			expect(messageDeltas.map((a) => (a as any).content).join("")).toBe(
				"Inside",
			);
		});
	});

	describe("unknown tags", () => {
		it("should treat unknown tags as plain text", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("<unknown>content</unknown>");

			// Should emit as text-delta
			const textDeltas = actions.filter((a) => a.type === "text-delta");
			const content = textDeltas.map((a) => (a as any).content).join("");
			expect(content).toBe("<unknown>content</unknown>");
		});
	});

	describe("edge cases", () => {
		it("should handle empty tags", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("<message></message>");

			expect(actions).toContainEqual({ type: "message-start" });
			expect(actions).toContainEqual({ type: "message-end" });
			expect(actions.filter((a) => a.type === "message-delta")).toHaveLength(0);
		});

		it("should handle special characters in content", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("<message>Hello & goodbye < world</message>");

			const deltas = actions.filter((a) => a.type === "message-delta");
			const content = deltas.map((a) => (a as any).content).join("");
			expect(content).toBe("Hello & goodbye < world");
		});

		it("should flush remaining content on flush()", () => {
			const parser = new InlineActionParser();
			parser.feed("<message>Partial");
			const flushed = parser.flush();

			// Should emit the buffered content and close the tag
			expect(flushed).toContainEqual({ type: "message-end" });
		});

		it("should reset state on reset()", () => {
			const parser = new InlineActionParser();
			parser.feed("<message>Test");
			parser.reset();

			// After reset, should be clean slate
			const actions = parser.feed("<title>New</title>");
			expect(actions).toContainEqual({ type: "title-start" });
			expect(actions).toContainEqual({ type: "title-end" });
		});
	});

	describe("case insensitivity", () => {
		it("should handle uppercase tags", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("<MESSAGE>Hello</MESSAGE>");

			expect(actions).toContainEqual({ type: "message-start" });
			expect(actions).toContainEqual({ type: "message-end" });
		});

		it("should handle mixed case tags", () => {
			const parser = new InlineActionParser();
			const actions = parser.feed("<Message>Hello</message>");

			expect(actions).toContainEqual({ type: "message-start" });
			expect(actions).toContainEqual({ type: "message-end" });
		});
	});
});
