import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationList } from "./ConversationList";
import type { Conversation } from "./types";

const createConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: "conv-1",
  userId: "user-1",
  childId: "child-1",
  title: "Test Conversation",
  metadata: null,
  messageCount: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  ...overrides,
});

describe("ConversationList", () => {
  describe("rendering", () => {
    it("renders header with new conversation button", () => {
      render(
        <ConversationList
          conversations={[]}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(screen.getByText("Conversations")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
    });

    it("renders empty state when no conversations", () => {
      render(
        <ConversationList
          conversations={[]}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(screen.getByText("No conversations yet")).toBeInTheDocument();
      expect(screen.getByText(/Start a new conversation/)).toBeInTheDocument();
    });

    it("renders loading state", () => {
      render(
        <ConversationList
          conversations={[]}
          isLoading
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      // Should show loading spinner
      expect(screen.queryByText("No conversations yet")).not.toBeInTheDocument();
    });

    it("renders list of conversations", () => {
      const conversations = [
        createConversation({ id: "1", title: "First Chat" }),
        createConversation({ id: "2", title: "Second Chat" }),
      ];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(screen.getByText("First Chat")).toBeInTheDocument();
      expect(screen.getByText("Second Chat")).toBeInTheDocument();
    });

    it("shows message count for each conversation", () => {
      const conversations = [
        createConversation({ messageCount: 10 }),
      ];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(screen.getByText("10 messages")).toBeInTheDocument();
    });

    it("shows 'New conversation' for conversations without title", () => {
      const conversations = [
        createConversation({ title: null }),
      ];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(screen.getByText("New conversation")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("highlights selected conversation", () => {
      const conversations = [
        createConversation({ id: "1", title: "Selected" }),
        createConversation({ id: "2", title: "Not Selected" }),
      ];

      render(
        <ConversationList
          conversations={conversations}
          selectedId="1"
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      const selectedItem = screen.getByRole("option", { selected: true });
      expect(selectedItem).toHaveTextContent("Selected");
    });

    it("calls onSelect when clicking a conversation", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const conversations = [createConversation({ id: "conv-123" })];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={onSelect}
          onNew={vi.fn()}
        />
      );

      await user.click(screen.getByRole("option"));

      expect(onSelect).toHaveBeenCalledWith("conv-123");
    });
  });

  describe("new conversation", () => {
    it("calls onNew when clicking new button", async () => {
      const user = userEvent.setup();
      const onNew = vi.fn();

      render(
        <ConversationList
          conversations={[]}
          onSelect={vi.fn()}
          onNew={onNew}
        />
      );

      await user.click(screen.getByRole("button", { name: /new/i }));

      expect(onNew).toHaveBeenCalled();
    });
  });

  describe("delete functionality", () => {
    it("shows menu button when onDelete is provided", () => {
      const conversations = [createConversation()];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Menu button should exist (may be hidden initially)
      expect(screen.getByRole("button", { name: /more options/i })).toBeInTheDocument();
    });

    it("shows delete option in menu", async () => {
      const user = userEvent.setup();
      const conversations = [createConversation()];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /more options/i }));

      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("calls onDelete when clicking delete", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      const conversations = [createConversation({ id: "to-delete" })];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole("button", { name: /more options/i }));
      await user.click(screen.getByText("Delete"));

      expect(onDelete).toHaveBeenCalledWith("to-delete");
    });

    it("closes menu when clicking outside", async () => {
      const user = userEvent.setup();
      const conversations = [createConversation()];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Open menu
      await user.click(screen.getByRole("button", { name: /more options/i }));
      expect(screen.getByText("Delete")).toBeInTheDocument();

      // Click outside (on the heading)
      await user.click(screen.getByText("Conversations"));

      // Menu should be closed
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has listbox role", () => {
      const conversations = [createConversation()];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("conversation items have option role", () => {
      const conversations = [createConversation()];

      render(
        <ConversationList
          conversations={conversations}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(screen.getByRole("option")).toBeInTheDocument();
    });

    it("new conversation button has aria-label", () => {
      render(
        <ConversationList
          conversations={[]}
          onSelect={vi.fn()}
          onNew={vi.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: /start new conversation/i })
      ).toBeInTheDocument();
    });
  });
});
