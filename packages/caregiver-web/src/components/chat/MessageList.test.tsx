import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "./MessageList";
import type { Message } from "./types";

const createMessage = (overrides: Partial<Message> = {}): Message => ({
  id: `msg-${Math.random()}`,
  conversationId: "conv-1",
  role: "user",
  content: "Test message",
  model: null,
  toolCalls: null,
  toolResults: null,
  tokenUsage: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("MessageList", () => {
  describe("rendering", () => {
    it("renders empty state when no messages", () => {
      render(<MessageList messages={[]} />);

      expect(screen.getByText("No messages yet")).toBeInTheDocument();
      expect(screen.getByText(/Start a conversation/)).toBeInTheDocument();
    });

    it("renders loading state", () => {
      render(<MessageList messages={[]} isLoading />);

      // Should not show empty state during loading
      expect(screen.queryByText("No messages yet")).not.toBeInTheDocument();
    });

    it("renders list of messages", () => {
      const messages = [
        createMessage({ id: "1", content: "Hello" }),
        createMessage({ id: "2", content: "How are you?", role: "assistant" }),
      ];

      render(<MessageList messages={messages} />);

      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("How are you?")).toBeInTheDocument();
    });

    it("renders messages in correct order", () => {
      const messages = [
        createMessage({ id: "1", content: "First" }),
        createMessage({ id: "2", content: "Second" }),
        createMessage({ id: "3", content: "Third" }),
      ];

      render(<MessageList messages={messages} />);

      const items = screen.getAllByRole("article");
      expect(items[0]).toHaveTextContent("First");
      expect(items[1]).toHaveTextContent("Second");
      expect(items[2]).toHaveTextContent("Third");
    });
  });

  describe("tool call status", () => {
    it("passes tool call status to message bubbles", () => {
      const messages = [
        createMessage({
          id: "1",
          role: "assistant",
          content: "",
          toolCalls: [
            { id: "tool-1", name: "search", arguments: {} },
          ],
        }),
      ];
      const toolCallStatus = new Map([
        ["tool-1", { name: "search", status: "pending" as const }],
      ]);

      render(<MessageList messages={messages} toolCallStatus={toolCallStatus} />);

      // Should show loading state for the tool call
      expect(screen.getByText(/Looking up/)).toBeInTheDocument();
    });
  });

  describe("timestamps", () => {
    it("shows timestamp for last message", () => {
      const messages = [
        createMessage({ id: "1", createdAt: new Date().toISOString() }),
      ];

      render(<MessageList messages={messages} />);

      // Should show a time
      expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has log role for message container", () => {
      const messages = [createMessage()];

      render(<MessageList messages={messages} />);

      expect(screen.getByRole("log")).toBeInTheDocument();
    });

    it("has aria-live polite for updates", () => {
      const messages = [createMessage()];

      render(<MessageList messages={messages} />);

      expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("scroll behavior", () => {
    it("calls scrollIntoView on mount", () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const messages = [createMessage()];
      render(<MessageList messages={messages} />);

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});
