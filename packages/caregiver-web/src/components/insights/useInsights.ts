/**
 * useInsights Hook
 *
 * Manages insights state and API interactions for the InsightsFeed component.
 *
 * FLY-98: Insights table and in-app feed
 */

import * as React from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface Insight {
  id: string;
  childId: string;
  type: string;
  severity: string | null;
  title: string | null;
  body: string | null;
  content: Record<string, unknown>;
  generatedAt: string;
  readAt: string | null;
  dismissedAt: string | null;
}

interface InsightsResponse {
  data: Insight[];
  meta: {
    total: number;
    unreadCount: number;
    limit: number;
    offset: number;
  };
}

interface UseInsightsReturn {
  insights: Insight[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

// =============================================================================
// CONFIG
// =============================================================================

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";
const REFRESH_INTERVAL = 60000; // 1 minute

// =============================================================================
// HOOK
// =============================================================================

export function useInsights(childId: string): UseInsightsReturn {
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [offset, setOffset] = React.useState(0);
  const limit = 20;

  // Fetch insights
  const fetchInsights = React.useCallback(
    async (reset = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const currentOffset = reset ? 0 : offset;
        const params = new URLSearchParams({
          childId,
          limit: limit.toString(),
          offset: currentOffset.toString(),
        });

        const response = await fetch(`${API_BASE}/insights?${params}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch insights: ${response.statusText}`);
        }

        const data: InsightsResponse = await response.json();

        if (reset) {
          setInsights(data.data);
          setOffset(limit);
        } else {
          setInsights((prev) => [...prev, ...data.data]);
          setOffset((prev) => prev + limit);
        }

        setUnreadCount(data.meta.unreadCount);
        setTotal(data.meta.total);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    },
    [childId, offset]
  );

  // Initial fetch
  React.useEffect(() => {
    fetchInsights(true);
  }, [childId]); // Only refetch when childId changes

  // Auto-refresh unread count periodically
  React.useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/insights/unread-count/${childId}`
        );
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count);
        }
      } catch {
        // Silently fail for background refresh
      }
    };

    const interval = setInterval(fetchUnreadCount, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [childId]);

  // Mark single insight as read
  const markAsRead = React.useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/insights/${id}/read`, {
        method: "PATCH",
      });

      if (response.ok) {
        setInsights((prev) =>
          prev.map((insight) =>
            insight.id === id
              ? { ...insight, readAt: new Date().toISOString() }
              : insight
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark insight as read:", err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = React.useCallback(async () => {
    const unreadIds = insights.filter((i) => !i.readAt).map((i) => i.id);
    if (unreadIds.length === 0) return;

    try {
      const response = await fetch(`${API_BASE}/insights/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      });

      if (response.ok) {
        const now = new Date().toISOString();
        setInsights((prev) =>
          prev.map((insight) =>
            unreadIds.includes(insight.id)
              ? { ...insight, readAt: now }
              : insight
          )
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, [insights]);

  // Dismiss insight
  const dismiss = React.useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/insights/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const dismissedInsight = insights.find((i) => i.id === id);
        setInsights((prev) => prev.filter((insight) => insight.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));

        // Update unread count if the dismissed insight was unread
        if (dismissedInsight && !dismissedInsight.readAt) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error("Failed to dismiss insight:", err);
    }
  }, [insights]);

  // Refresh (reset and fetch)
  const refresh = React.useCallback(async () => {
    await fetchInsights(true);
  }, [fetchInsights]);

  // Load more
  const loadMore = React.useCallback(async () => {
    await fetchInsights(false);
  }, [fetchInsights]);

  const hasMore = insights.length < total;

  return {
    insights,
    unreadCount,
    total,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh,
    loadMore,
    hasMore,
  };
}

export default useInsights;
