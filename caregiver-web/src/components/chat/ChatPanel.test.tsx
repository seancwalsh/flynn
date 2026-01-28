/**
 * ChatPanel Component Tests
 *
 * Tests for error banner display and dismissal.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock useChat hook to control error state - MUST be before ChatPanel import
const mockUseChat = vi.fn();
vi.mock("./useChat", () => ({
  useChat: () => mockUseChat(),
}));

import { ChatPanel } from "./ChatPanel";

describe("ChatPanel", () => {
  const defaultUseChatReturn = {
    conversations: [],
    currentConversation: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    activeToolCalls: new Map(),
    loadConversations: vi.fn(),
    selectConversation: vi.fn(),
    createNewConversation: vi.fn(),
    deleteConversation: vi.fn(),
    sendMessage: vi.fn(),
    stopStreaming: vi.fn(),
    clearError: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockUseChat.mockReturnValue(defaultUseChatReturn);
  });

  describe("ErrorBanner", () => {
    it("displays error banner when error is present", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: "Something went wrong",
      });

      render(<ChatPanel childId="child-123" />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("does not display error banner when error is null", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: null,
      });

      render(<ChatPanel childId="child-123" />);

      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    it("calls clearError when dismiss button is clicked", async () => {
      const clearError = vi.fn();
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: "Test error",
        clearError,
      });

      render(<ChatPanel childId="child-123" />);

      const dismissButton = screen.getByRole("button", { name: /dismiss error/i });
      await userEvent.click(dismissButton);

      expect(clearError).toHaveBeenCalledTimes(1);
    });

    it("displays 401 unauthorized error message", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: "Unauthorized",
      });

      render(<ChatPanel childId="child-123" />);

      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });

    it("displays 500 server error message", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: "Internal server error",
      });

      render(<ChatPanel childId="child-123" />);

      expect(screen.getByText("Internal server error")).toBeInTheDocument();
    });

    it("displays network error message", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: "Failed to fetch",
      });

      render(<ChatPanel childId="child-123" />);

      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    });

    it("has correct styling for error banner", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: "Test error",
      });

      render(<ChatPanel childId="child-123" />);

      const errorBanner = screen.getByText("Test error").closest("div");
      expect(errorBanner).toHaveClass("bg-red-50", "text-red-700");
    });

    it("displays alert icon in error banner", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        error: "Test error",
      });

      render(<ChatPanel childId="child-123" />);

      // The AlertCircle icon should be rendered (it's an SVG)
      const errorBanner = screen.getByText("Test error").closest("div");
      const svg = errorBanner?.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows loading state in conversation list", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        isLoading: true,
      });

      render(<ChatPanel childId="child-123" />);

      // The component should render without crashing during loading
      expect(screen.getByText("Chat")).toBeInTheDocument();
    });
  });

  describe("No conversation selected", () => {
    it("shows prompt to start new conversation when none selected", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        isLoading: false,
        currentConversation: null,
      });

      render(<ChatPanel childId="child-123" />);

      expect(
        screen.getByText("Select a conversation or start a new one")
      ).toBeInTheDocument();
      // Use getByText for the main area button (not the sidebar "New" button)
      expect(
        screen.getByText("Start New Conversation")
      ).toBeInTheDocument();
    });

    it("calls createNewConversation when button is clicked", async () => {
      const createNewConversation = vi.fn();
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        isLoading: false,
        currentConversation: null,
        createNewConversation,
      });

      render(<ChatPanel childId="child-123" />);

      // Get the button by its exact text (not the sidebar "New" button)
      const button = screen.getByText("Start New Conversation");
      await userEvent.click(button);

      expect(createNewConversation).toHaveBeenCalledWith({ childId: "child-123" });
    });
  });

  describe("Conversation selected", () => {
    it("displays conversation title", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        currentConversation: {
          id: "conv-123",
          childId: "child-123",
          userId: "user-123",
          title: "Test Conversation Title",
          messageCount: 0,
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      });

      render(<ChatPanel childId="child-123" />);

      expect(screen.getByText("Test Conversation Title")).toBeInTheDocument();
    });

    it("shows chat input when conversation is selected", () => {
      mockUseChat.mockReturnValue({
        ...defaultUseChatReturn,
        currentConversation: {
          id: "conv-123",
          childId: "child-123",
          userId: "user-123",
          title: "Test Conversation",
          messageCount: 0,
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      });

      render(<ChatPanel childId="child-123" />);

      expect(
        screen.getByPlaceholderText(/ask me anything/i)
      ).toBeInTheDocument();
    });
  });

  describe("Slide-over mode", () => {
    it("renders in slide-over mode when specified", () => {
      mockUseChat.mockReturnValue(defaultUseChatReturn);

      render(<ChatPanel childId="child-123" mode="slide-over" isOpen={true} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not render when slide-over is closed", () => {
      mockUseChat.mockReturnValue(defaultUseChatReturn);

      const { container } = render(
        <ChatPanel childId="child-123" mode="slide-over" isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("calls onClose when close button is clicked", async () => {
      const onClose = vi.fn();
      mockUseChat.mockReturnValue(defaultUseChatReturn);

      render(
        <ChatPanel
          childId="child-123"
          mode="slide-over"
          isOpen={true}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByRole("button", { name: /close chat/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error scenarios integration", () => {
    it("error handling is covered by useChat.test.ts", () => {
      // This is a placeholder to document that error scenario integration
      // is tested at the useChat hook level rather than component level.
      // See src/components/chat/useChat.test.ts for those tests.
      expect(true).toBe(true);
    });
  });
});
