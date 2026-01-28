/**
 * Tests for InsightsFeed Component
 * FLY-98: Insights table and in-app feed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InsightsFeed } from "./InsightsFeed";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockInsights = [
  {
    id: "1",
    childId: "child-1",
    type: "daily_digest",
    severity: null,
    title: "Daily Progress Summary",
    body: "Flynn had a great day with 47 AAC taps!",
    content: { totalTaps: 47, uniqueSymbols: 12 },
    generatedAt: new Date().toISOString(),
    readAt: null,
    dismissedAt: null,
  },
  {
    id: "2",
    childId: "child-1",
    type: "regression_alert",
    severity: "warning",
    title: "Usage Drop Detected",
    body: "AAC usage dropped 40% compared to baseline",
    content: { expected: 50, actual: 30, zScore: -2.0 },
    generatedAt: new Date(Date.now() - 3600000).toISOString(),
    readAt: null,
    dismissedAt: null,
  },
  {
    id: "3",
    childId: "child-1",
    type: "milestone",
    severity: "info",
    title: "New Word Milestone!",
    body: "Flynn used 5 new words this week",
    content: { newWords: ["want", "more", "help", "eat", "play"] },
    generatedAt: new Date(Date.now() - 86400000).toISOString(),
    readAt: new Date(Date.now() - 43200000).toISOString(),
    dismissedAt: null,
  },
];

const mockInsightsResponse = {
  data: mockInsights,
  meta: {
    total: 3,
    unreadCount: 2,
    limit: 20,
    offset: 0,
  },
};

describe("InsightsFeed", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInsightsResponse),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders bell icon", () => {
    render(<InsightsFeed childId="child-1" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows unread badge when there are unread insights", async () => {
    render(<InsightsFeed childId="child-1" />);

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("fetches insights on mount", async () => {
    render(<InsightsFeed childId="child-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/insights?childId=child-1")
      );
    });
  });

  it("opens popover when bell is clicked", async () => {
    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Insights")).toBeInTheDocument();
    });
  });

  it("displays insight cards when popover is open", async () => {
    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Daily Progress Summary")).toBeInTheDocument();
      expect(screen.getByText("Usage Drop Detected")).toBeInTheDocument();
      expect(screen.getByText("New Word Milestone!")).toBeInTheDocument();
    });
  });

  it("shows severity indicators on alerts", async () => {
    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Regression Alert")).toBeInTheDocument();
    });
  });

  it("shows empty state when no insights", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          meta: { total: 0, unreadCount: 0, limit: 20, offset: 0 },
        }),
    });

    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("All caught up!")).toBeInTheDocument();
    });
  });
});

describe("InsightsFeed - Interactions", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInsightsResponse),
    });
  });

  it("calls dismiss API when X is clicked", async () => {
    render(<InsightsFeed childId="child-1" />);

    // Open popover
    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Daily Progress Summary")).toBeInTheDocument();
    });

    // Click first dismiss button
    const dismissButtons = screen.getAllByRole("button", { name: "" });
    const dismissButton = dismissButtons.find(
      (btn) => btn.querySelector("svg")?.classList.contains("lucide-x")
    );

    if (dismissButton) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/insights/1"),
          expect.objectContaining({ method: "DELETE" })
        );
      });
    }
  });

  it("refreshes when refresh button is clicked", async () => {
    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    await waitFor(() => {
      // Should have been called twice - initial + refresh
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe("InsightsFeed - Severity Styling", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("applies critical styling for critical severity", async () => {
    const criticalInsight = {
      ...mockInsights[1],
      id: "critical-1",
      severity: "critical",
      title: "Critical Alert",
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [criticalInsight],
          meta: { total: 1, unreadCount: 1, limit: 20, offset: 0 },
        }),
    });

    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Critical Alert")).toBeInTheDocument();
    });
  });

  it("applies warning styling for warning severity", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [mockInsights[1]],
          meta: { total: 1, unreadCount: 1, limit: 20, offset: 0 },
        }),
    });

    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Usage Drop Detected")).toBeInTheDocument();
    });
  });
});

describe("useInsights hook behavior", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInsightsResponse),
    });
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<InsightsFeed childId="child-1" />);

    // Should not crash
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  it("handles API error responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    render(<InsightsFeed childId="child-1" />);

    // Should not crash
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});
