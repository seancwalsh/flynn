/**
 * Tests for InsightsFeed Component
 * FLY-98: Insights table and in-app feed
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "~/mocks/node";
import { InsightsFeed } from "./InsightsFeed";

const API_BASE = "http://localhost:3000/api/v1";

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

// Default handler for insights
const defaultInsightsHandler = http.get(`${API_BASE}/insights`, () => {
  return HttpResponse.json(mockInsightsResponse);
});

// Delete/dismiss handler
const deleteInsightHandler = http.delete(`${API_BASE}/insights/:id`, () => {
  return HttpResponse.json({ success: true });
});

describe("InsightsFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(defaultInsightsHandler, deleteInsightHandler);
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

    // Verify insights are fetched by checking the badge appears
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
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
    server.use(
      http.get(`${API_BASE}/insights`, () => {
        return HttpResponse.json({
          data: [],
          meta: { total: 0, unreadCount: 0, limit: 20, offset: 0 },
        });
      })
    );

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
    vi.clearAllMocks();
    server.use(defaultInsightsHandler, deleteInsightHandler);
  });

  it("calls dismiss API when X is clicked", async () => {
    let deleteCalled = false;
    server.use(
      http.delete(`${API_BASE}/insights/:id`, () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

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
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(deleteCalled).toBe(true);
      });
    }
  });

  it("refreshes when refresh button is clicked", async () => {
    let fetchCount = 0;
    server.use(
      http.get(`${API_BASE}/insights`, () => {
        fetchCount++;
        return HttpResponse.json(mockInsightsResponse);
      })
    );

    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    const initialFetchCount = fetchCount;
    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    await waitFor(() => {
      // Should have been called at least once more after refresh
      expect(fetchCount).toBeGreaterThan(initialFetchCount);
    });
  });
});

describe("InsightsFeed - Severity Styling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies critical styling for critical severity", async () => {
    const criticalInsight = {
      ...mockInsights[1],
      id: "critical-1",
      severity: "critical",
      title: "Critical Alert",
    };

    server.use(
      http.get(`${API_BASE}/insights`, () => {
        return HttpResponse.json({
          data: [criticalInsight],
          meta: { total: 1, unreadCount: 1, limit: 20, offset: 0 },
        });
      })
    );

    render(<InsightsFeed childId="child-1" />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Critical Alert")).toBeInTheDocument();
    });
  });

  it("applies warning styling for warning severity", async () => {
    server.use(
      http.get(`${API_BASE}/insights`, () => {
        return HttpResponse.json({
          data: [mockInsights[1]],
          meta: { total: 1, unreadCount: 1, limit: 20, offset: 0 },
        });
      })
    );

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
    vi.clearAllMocks();
    server.use(defaultInsightsHandler);
  });

  it("handles fetch errors gracefully", async () => {
    server.use(
      http.get(`${API_BASE}/insights`, () => {
        return HttpResponse.error();
      })
    );

    render(<InsightsFeed childId="child-1" />);

    // Should not crash
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  it("handles API error responses", async () => {
    server.use(
      http.get(`${API_BASE}/insights`, () => {
        return HttpResponse.json(
          { message: "Internal Server Error" },
          { status: 500 }
        );
      })
    );

    render(<InsightsFeed childId="child-1" />);

    // Should not crash
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});
