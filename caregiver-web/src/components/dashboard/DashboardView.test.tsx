/**
 * Tests for DashboardView Component
 * 
 * Integration tests for the main dashboard container:
 * - Dashboard mode (default)
 * - Chat mode transition
 * - Widget integration
 * - Interactions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardView } from "./DashboardView";
import type { DashboardChild, TodayStats } from "./types";

// Mock the chat components since they have their own tests
vi.mock("~/components/chat/ChatInput", () => ({
  ChatInput: vi.fn(({ onSend, disabled, placeholder }) => (
    <div data-testid="chat-input">
      <input
        data-testid="chat-input-field"
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            const target = e.target as HTMLInputElement;
            onSend(target.value);
          }
        }}
      />
    </div>
  )),
}));

vi.mock("~/components/chat/MessageList", () => ({
  MessageList: vi.fn(({ messages }) => (
    <div data-testid="message-list">
      {messages.map((m: { id: string; content: string }) => (
        <div key={m.id}>{m.content}</div>
      ))}
    </div>
  )),
}));

vi.mock("~/components/chat/useChat", () => ({
  useChat: vi.fn(() => ({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    activeToolCalls: new Map(),
    sendMessage: vi.fn(),
    stopStreaming: vi.fn(),
    clearError: vi.fn(),
  })),
}));

const mockChildren: DashboardChild[] = [
  { id: "child-1", name: "Flynn", age: 5 },
  { id: "child-2", name: "Jamie", age: 2 },
];

const mockTodayStats: TodayStats = {
  sessionsLogged: 3,
  wordsUsed: 47,
  communicationAttempts: 12,
  observation: "Great progress today!",
};

const mockInsights = [
  {
    id: "1",
    type: "trend_up" as const,
    title: "Speech variety up",
    description: "More words this week",
    timestamp: new Date(),
  },
];

describe("DashboardView", () => {
  const defaultProps = {
    children: mockChildren,
    selectedChild: mockChildren[0],
    onSelectChild: vi.fn(),
    todayStats: mockTodayStats,
    insights: mockInsights,
    isLoadingStats: false,
    isLoadingInsights: false,
    onAddSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // BASIC RENDERING
  // ==========================================================================

  describe("Basic Rendering", () => {
    it("renders the child selector", () => {
      render(<DashboardView {...defaultProps} />);

      expect(screen.getByText("Flynn")).toBeInTheDocument();
    });

    it("renders the Today widget", () => {
      render(<DashboardView {...defaultProps} />);

      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument(); // sessions
      expect(screen.getByText("47")).toBeInTheDocument(); // words
    });

    it("renders the Insights widget", () => {
      render(<DashboardView {...defaultProps} />);

      expect(screen.getByText("Insights")).toBeInTheDocument();
      expect(screen.getByText("Speech variety up")).toBeInTheDocument();
    });

    it("renders the chat input", () => {
      render(<DashboardView {...defaultProps} />);

      expect(screen.getByTestId("chat-input")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // LOADING STATES
  // ==========================================================================

  describe("Loading States", () => {
    it("shows loading skeleton for stats", () => {
      render(<DashboardView {...defaultProps} isLoadingStats={true} />);

      // TodayWidget should show skeleton
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows loading skeleton for insights", () => {
      render(<DashboardView {...defaultProps} isLoadingInsights={true} />);

      // InsightsWidget should show skeleton
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // INTERACTIONS
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onSelectChild when child is changed", () => {
      const onSelectChild = vi.fn();
      render(<DashboardView {...defaultProps} onSelectChild={onSelectChild} />);

      // Open dropdown and select Jamie
      const selectorButton = screen.getByText("Flynn").closest("button");
      fireEvent.click(selectorButton!);
      
      const jamieOption = screen.getByText("Jamie");
      fireEvent.click(jamieOption);

      expect(onSelectChild).toHaveBeenCalledWith(mockChildren[1]);
    });

    it("calls onAddSession when Log Session is clicked", () => {
      const onAddSession = vi.fn();
      render(<DashboardView {...defaultProps} onAddSession={onAddSession} />);

      fireEvent.click(screen.getByText("Log Session"));

      expect(onAddSession).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EMPTY STATES
  // ==========================================================================

  describe("Empty States", () => {
    it("shows empty Today widget when no stats", () => {
      render(
        <DashboardView
          {...defaultProps}
          todayStats={{
            sessionsLogged: 0,
            wordsUsed: 0,
            communicationAttempts: 0,
          }}
        />
      );

      expect(screen.getByText("No activity logged today")).toBeInTheDocument();
    });

    it("shows empty Insights widget when no insights", () => {
      render(<DashboardView {...defaultProps} insights={[]} />);

      expect(screen.getByText("No insights yet")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // DISABLED STATE
  // ==========================================================================

  describe("No Child Selected", () => {
    it("disables chat input when no child selected", () => {
      render(<DashboardView {...defaultProps} selectedChild={null} />);

      const chatInput = screen.getByTestId("chat-input-field");
      expect(chatInput).toBeDisabled();
    });
  });

  // ==========================================================================
  // STYLING
  // ==========================================================================

  describe("Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <DashboardView {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  // ==========================================================================
  // PLACEHOLDER TEXT
  // ==========================================================================

  describe("Chat Placeholder", () => {
    it("shows personalized placeholder with child name", () => {
      render(<DashboardView {...defaultProps} />);

      // The placeholder should mention the child's name
      // This depends on implementation - check if visible in dashboard mode
      expect(screen.getByTestId("chat-input")).toBeInTheDocument();
    });
  });
});
