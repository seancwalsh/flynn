import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "./types";

const createMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "msg-1",
  conversationId: "conv-1",
  role: "user",
  content: "Hello, world!",
  model: null,
  toolCalls: null,
  toolResults: null,
  tokenUsage: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("MessageBubble", () => {
  describe("rendering", () => {
    it("renders user message with correct styling", () => {
      const message = createMessage({ role: "user", content: "Test message" });
      render(<MessageBubble message={message} />);

      expect(screen.getByText("Test message")).toBeInTheDocument();
      expect(screen.getByRole("article")).toHaveAttribute(
        "aria-label",
        "user message"
      );
    });

    it("renders assistant message with correct styling", () => {
      const message = createMessage({
        role: "assistant",
        content: "I can help with that!",
      });
      render(<MessageBubble message={message} />);

      expect(screen.getByText("I can help with that!")).toBeInTheDocument();
      expect(screen.getByRole("article")).toHaveAttribute(
        "aria-label",
        "assistant message"
      );
    });

    it("renders system message with label", () => {
      const message = createMessage({
        role: "system",
        content: "System notification",
      });
      render(<MessageBubble message={message} />);

      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.getByText("System notification")).toBeInTheDocument();
    });

    it("does not render tool messages directly", () => {
      const message = createMessage({ role: "tool", content: "Tool result" });
      const { container } = render(<MessageBubble message={message} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("streaming state", () => {
    it("shows typing indicator when streaming with no content", () => {
      const message = createMessage({
        role: "assistant",
        content: "",
        isStreaming: true,
      });
      render(<MessageBubble message={message} />);

      expect(screen.getByLabelText("Typing")).toBeInTheDocument();
    });

    it("shows cursor indicator when streaming with content", () => {
      const message = createMessage({
        role: "assistant",
        content: "Generating...",
        isStreaming: true,
      });
      render(<MessageBubble message={message} />);

      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });

    it("does not show timestamp while streaming", () => {
      const message = createMessage({
        role: "assistant",
        content: "In progress",
        isStreaming: true,
      });
      render(<MessageBubble message={message} showTimestamp={true} />);

      // Timestamp should not be visible during streaming
      const timestamp = screen.queryByText(/\d{1,2}:\d{2}/);
      expect(timestamp).not.toBeInTheDocument();
    });
  });

  describe("pending state", () => {
    it("applies reduced opacity for pending messages", () => {
      const message = createMessage({ isPending: true });
      render(<MessageBubble message={message} />);

      const bubble = screen.getByRole("article").firstChild;
      expect(bubble).toHaveClass("opacity-70");
    });
  });

  describe("tool calls", () => {
    it("renders tool calls for assistant messages", async () => {
      const user = userEvent.setup();
      const message = createMessage({
        role: "assistant",
        content: "Here's what I found:",
        toolCalls: [
          {
            id: "tool-1",
            name: "web_search",
            arguments: { query: "AAC tips" },
          },
        ],
      });
      render(<MessageBubble message={message} />);

      // Tool call should be rendered
      expect(screen.getByText("Web search")).toBeInTheDocument();

      // Click to expand
      await user.click(screen.getByText("Web search"));

      // Should show arguments
      expect(screen.getByText(/AAC tips/)).toBeInTheDocument();
    });

    it("shows loading state for pending tool calls", () => {
      const message = createMessage({
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tool-1",
            name: "database",
            arguments: { query: "SELECT * FROM users" },
          },
        ],
      });
      const toolCallStatus = new Map([
        ["tool-1", { name: "database", status: "pending" as const }],
      ]);

      render(<MessageBubble message={message} toolCallStatus={toolCallStatus} />);

      expect(screen.getByText(/Looking up/)).toBeInTheDocument();
    });

    it("shows tool result when available", async () => {
      const user = userEvent.setup();
      const message = createMessage({
        role: "assistant",
        content: "Results:",
        toolCalls: [
          {
            id: "tool-1",
            name: "search",
            arguments: { q: "test" },
          },
        ],
        toolResults: [
          {
            toolCallId: "tool-1",
            content: "Found 5 results",
          },
        ],
      });

      render(<MessageBubble message={message} />);

      // Expand tool call
      await user.click(screen.getByRole("button", { expanded: false }));

      // Should show result
      expect(screen.getByText("Found 5 results")).toBeInTheDocument();
    });

    it("shows error state for failed tool calls", async () => {
      const user = userEvent.setup();
      const message = createMessage({
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tool-1",
            name: "api_call",
            arguments: {},
          },
        ],
        toolResults: [
          {
            toolCallId: "tool-1",
            content: "Connection failed",
            isError: true,
          },
        ],
      });

      render(<MessageBubble message={message} />);
      await user.click(screen.getByRole("button", { expanded: false }));

      expect(screen.getByText("Error:")).toBeInTheDocument();
      expect(screen.getByText("Connection failed")).toBeInTheDocument();
    });
  });

  describe("timestamp", () => {
    it("shows timestamp when showTimestamp is true", () => {
      const message = createMessage({
        createdAt: new Date().toISOString(),
      });
      render(<MessageBubble message={message} showTimestamp={true} />);

      // Should show time in HH:MM format
      expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
    });

    it("hides timestamp when showTimestamp is false", () => {
      const message = createMessage();
      render(<MessageBubble message={message} showTimestamp={false} />);

      const time = screen.queryByText(/\d{1,2}:\d{2}/);
      expect(time).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has correct aria-label for message role", () => {
      const message = createMessage({ role: "assistant" });
      render(<MessageBubble message={message} />);

      expect(screen.getByRole("article")).toHaveAttribute(
        "aria-label",
        "assistant message"
      );
    });

    it("tool call buttons have aria-expanded attribute", async () => {
      const user = userEvent.setup();
      const message = createMessage({
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "tool-1", name: "test", arguments: {} },
        ],
      });

      render(<MessageBubble message={message} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");

      await user.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
    });
  });
});
