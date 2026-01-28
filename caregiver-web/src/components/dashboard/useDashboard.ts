/**
 * useDashboard Hook
 * FLY-139: Caregiver Dashboard - Smart Overview
 *
 * Fetches and manages dashboard data:
 * - Children list
 * - Today's activity stats
 * - Pre-computed insights
 */

import * as React from "react";
import type { DashboardChild, TodayStats } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

interface Insight {
  id: string;
  type: "trend_up" | "trend_down" | "alert" | "milestone" | "suggestion";
  title: string;
  description: string;
  timestamp: Date;
}

interface UseDashboardReturn {
  children: DashboardChild[];
  selectedChild: DashboardChild | null;
  todayStats: TodayStats | null;
  insights: Insight[];
  isLoadingChildren: boolean;
  isLoadingStats: boolean;
  isLoadingInsights: boolean;
  error: string | null;
  selectChild: (child: DashboardChild) => void;
  refreshStats: () => Promise<void>;
  refreshInsights: () => Promise<void>;
}

async function fetchWithAuth<T>(endpoint: string): Promise<T> {
  const token = localStorage.getItem("clerkToken");
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export function useDashboard(): UseDashboardReturn {
  const [children, setChildren] = React.useState<DashboardChild[]>([]);
  const [selectedChild, setSelectedChild] = React.useState<DashboardChild | null>(null);
  const [todayStats, setTodayStats] = React.useState<TodayStats | null>(null);
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = React.useState(true);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch children on mount
  React.useEffect(() => {
    async function fetchChildren() {
      try {
        setIsLoadingChildren(true);
        const data = await fetchWithAuth<{ children: Array<{ id: string; name: string; birthDate?: string }> }>(
          "/children"
        );

        const dashboardChildren: DashboardChild[] = data.children.map((child) => ({
          id: child.id,
          name: child.name,
          age: child.birthDate
            ? Math.floor(
                (Date.now() - new Date(child.birthDate).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
              )
            : undefined,
        }));

        setChildren(dashboardChildren);

        // Auto-select first child if none selected
        if (dashboardChildren.length > 0 && !selectedChild) {
          setSelectedChild(dashboardChildren[0]);
        }
      } catch (err) {
        console.error("Failed to fetch children:", err);
        setError("Failed to load children");
      } finally {
        setIsLoadingChildren(false);
      }
    }

    fetchChildren();
  }, []);

  // Fetch today's stats when child changes
  const refreshStats = React.useCallback(async () => {
    if (!selectedChild) {
      setTodayStats(null);
      return;
    }

    try {
      setIsLoadingStats(true);
      setError(null);

      // Fetch today's usage logs
      const today = new Date().toISOString().split("T")[0];
      const logsData = await fetchWithAuth<{
        logs: Array<{
          wordCount?: number;
          sessionDurationSeconds?: number;
        }>;
      }>(`/children/${selectedChild.id}/usage-logs?startDate=${today}`);

      // Aggregate stats
      const sessionsLogged = logsData.logs?.length || 0;
      const wordsUsed = logsData.logs?.reduce((sum, log) => sum + (log.wordCount || 0), 0) || 0;
      const communicationAttempts = logsData.logs?.reduce(
        (sum, log) => sum + Math.ceil((log.sessionDurationSeconds || 0) / 60),
        0
      ) || 0;

      // Try to fetch cached insight/observation
      let observation: string | undefined;
      try {
        const insightData = await fetchWithAuth<{
          insights: Array<{ content?: string; type?: string }>;
        }>(`/children/${selectedChild.id}/insights?limit=1&type=daily_digest`);

        if (insightData.insights?.[0]?.content) {
          // Extract a short observation from the insight
          const content = insightData.insights[0].content;
          observation = content.length > 100 ? content.substring(0, 97) + "..." : content;
        }
      } catch {
        // Insight fetch is optional, don't fail the whole stats load
      }

      setTodayStats({
        sessionsLogged,
        wordsUsed,
        communicationAttempts,
        observation,
      });
    } catch (err) {
      console.error("Failed to fetch today stats:", err);
      setError("Failed to load today's activity");
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedChild]);

  // Fetch insights when child changes
  const refreshInsights = React.useCallback(async () => {
    if (!selectedChild) {
      setInsights([]);
      return;
    }

    try {
      setIsLoadingInsights(true);

      const data = await fetchWithAuth<{
        insights: Array<{
          id: string;
          type: string;
          title?: string;
          content: string;
          severity?: string;
          createdAt: string;
        }>;
      }>(`/children/${selectedChild.id}/insights?limit=10`);

      const mappedInsights: Insight[] = (data.insights || []).map((insight) => ({
        id: insight.id,
        type: mapInsightType(insight.type, insight.severity),
        title: insight.title || formatInsightTitle(insight.type),
        description: insight.content,
        timestamp: new Date(insight.createdAt),
      }));

      setInsights(mappedInsights);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
      // Don't set error for insights, they're optional
    } finally {
      setIsLoadingInsights(false);
    }
  }, [selectedChild]);

  // Refresh data when child changes
  React.useEffect(() => {
    refreshStats();
    refreshInsights();
  }, [refreshStats, refreshInsights]);

  const selectChild = React.useCallback((child: DashboardChild) => {
    setSelectedChild(child);
  }, []);

  return {
    children,
    selectedChild,
    todayStats,
    insights,
    isLoadingChildren,
    isLoadingStats,
    isLoadingInsights,
    error,
    selectChild,
    refreshStats,
    refreshInsights,
  };
}

// Helper functions
function mapInsightType(
  type: string,
  severity?: string
): Insight["type"] {
  if (type === "regression_alert" || severity === "critical") return "alert";
  if (type === "milestone") return "milestone";
  if (type === "anomaly" && severity === "warning") return "trend_down";
  if (type === "daily_digest" || type === "weekly_report") return "trend_up";
  return "suggestion";
}

function formatInsightTitle(type: string): string {
  const titles: Record<string, string> = {
    daily_digest: "Daily Summary",
    weekly_report: "Weekly Progress",
    regression_alert: "Attention Needed",
    milestone: "Milestone Reached!",
    suggestion: "Suggestion",
    anomaly: "Pattern Detected",
  };
  return titles[type] || "Insight";
}
