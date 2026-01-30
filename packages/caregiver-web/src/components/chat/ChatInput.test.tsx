import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "./ChatInput";

describe("ChatInput", () => {
  describe("rendering", () => {
    it("renders textarea and send button", () => {
      render(<ChatInput onSend={vi.fn()} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    });

    it("shows custom placeholder", () => {
      render(<ChatInput onSend={vi.fn()} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText("Custom placeholder")).toBeInTheDocument();
    });

    it("shows keyboard hints", () => {
      render(<ChatInput onSend={vi.fn()} />);

      expect(screen.getByText("Enter")).toBeInTheDocument();
      expect(screen.getByText("Shift+Enter")).toBeInTheDocument();
    });
  });

  describe("sending messages", () => {
    it("calls onSend when clicking send button", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "Hello");
      await user.click(screen.getByRole("button", { name: /send/i }));

      expect(onSend).toHaveBeenCalledWith("Hello");
    });

    it("calls onSend when pressing Enter", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test message{Enter}");

      expect(onSend).toHaveBeenCalledWith("Test message");
    });

    it("adds newline when pressing Shift+Enter", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");

      expect(onSend).not.toHaveBeenCalled();
      expect(textarea).toHaveValue("Line 1\nLine 2");
    });

    it("clears input after sending", async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={vi.fn()} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Message{Enter}");

      expect(textarea).toHaveValue("");
    });

    it("trims whitespace from message", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "  spaced  {Enter}");

      expect(onSend).toHaveBeenCalledWith("spaced");
    });

    it("does not send empty messages", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.type(screen.getByRole("textbox"), "   {Enter}");

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("disables input when disabled prop is true", () => {
      render(<ChatInput onSend={vi.fn()} disabled />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("disables send button when no content", () => {
      render(<ChatInput onSend={vi.fn()} />);

      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });

    it("disables send button when disabled", async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={vi.fn()} disabled />);

      // Even with content, should be disabled
      await user.type(screen.getByRole("textbox"), "Test");
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });
  });

  describe("streaming state", () => {
    it("disables input when streaming", () => {
      render(<ChatInput onSend={vi.fn()} isStreaming />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("shows stop button when streaming", () => {
      render(<ChatInput onSend={vi.fn()} isStreaming onStop={vi.fn()} />);

      expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /send/i })).not.toBeInTheDocument();
    });

    it("calls onStop when clicking stop button", async () => {
      const user = userEvent.setup();
      const onStop = vi.fn();
      render(<ChatInput onSend={vi.fn()} isStreaming onStop={onStop} />);

      await user.click(screen.getByRole("button", { name: /stop/i }));

      expect(onStop).toHaveBeenCalled();
    });
  });

  describe("character count", () => {
    it("shows character count for long messages", async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={vi.fn()} />);

      const longText = "x".repeat(501);
      await user.type(screen.getByRole("textbox"), longText);

      expect(screen.getByText("501")).toBeInTheDocument();
    });

    it("does not show character count for short messages", async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={vi.fn()} />);

      await user.type(screen.getByRole("textbox"), "Short message");

      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("textarea has aria-label", () => {
      render(<ChatInput onSend={vi.fn()} />);

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-label",
        "Message input"
      );
    });

    it("send button has aria-label", () => {
      render(<ChatInput onSend={vi.fn()} />);

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Send message"
      );
    });

    it("stop button has aria-label when streaming", () => {
      render(<ChatInput onSend={vi.fn()} isStreaming onStop={vi.fn()} />);

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Stop generating"
      );
    });
  });
});
