/**
 * MSW handlers for dashboard endpoints
 * 
 * Tests all possible server responses for the caregiver dashboard.
 */

import { http, HttpResponse, delay } from "msw";

const API_BASE = "http://localhost:3000/api/v1";

// =============================================================================
// MOCK DATA
// =============================================================================

export const mockChildren = [
  {
    id: "child-1",
    name: "Flynn",
    birthDate: "2021-04-26",
    familyId: "family-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "child-2",
    name: "Jamie",
    birthDate: "2023-04-23",
    familyId: "family-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const mockDashboardSummary = {
  child: {
    id: "child-1",
    name: "Flynn",
    birthDate: "2021-04-26",
  },
  today: {
    sessionsLogged: 3,
    wordsUsed: 47,
    communicationAttempts: 12,
    observation: "More spontaneous requests today",
  },
  insights: [
    {
      id: "insight-1",
      type: "regression_alert",
      severity: "warning",
      title: "Usage Drop Detected",
      body: "Communication frequency decreased by 15% this week",
      createdAt: new Date().toISOString(),
    },
    {
      id: "insight-2",
      type: "milestone",
      severity: "info",
      title: "New 3-Word Phrases!",
      body: "Flynn combined 3 words consistently for the first time",
      createdAt: new Date().toISOString(),
    },
    {
      id: "insight-3",
      type: "suggestion",
      severity: null,
      title: "Try Food Vocabulary",
      body: "Flynn shows interest in food-related symbols. Consider expanding this category.",
      createdAt: new Date().toISOString(),
    },
  ],
  lastUpdated: new Date().toISOString(),
};

export const mockTodayStats = {
  sessionsLogged: 3,
  wordsUsed: 47,
  communicationAttempts: 12,
};

export const mockEmptyDashboard = {
  child: {
    id: "child-1",
    name: "Flynn",
    birthDate: "2021-04-26",
  },
  today: {
    sessionsLogged: 0,
    wordsUsed: 0,
    communicationAttempts: 0,
    observation: undefined,
  },
  insights: [],
  lastUpdated: new Date().toISOString(),
};

// =============================================================================
// SUCCESS HANDLERS
// =============================================================================

// List children
export const listChildrenHandler = http.get(`${API_BASE}/children`, async () => {
  await delay(50);
  return HttpResponse.json({ children: mockChildren });
});

// Get dashboard summary
export const getDashboardHandler = http.get(
  `${API_BASE}/children/:childId/dashboard`,
  async ({ params }) => {
    await delay(50);
    return HttpResponse.json({
      data: {
        ...mockDashboardSummary,
        child: {
          ...mockDashboardSummary.child,
          id: params.childId as string,
        },
      },
    });
  }
);

// Get today stats
export const getTodayHandler = http.get(
  `${API_BASE}/children/:childId/today`,
  async () => {
    await delay(50);
    return HttpResponse.json({ data: mockTodayStats });
  }
);

// Refresh insights
export const refreshInsightsHandler = http.post(
  `${API_BASE}/children/:childId/insights/refresh`,
  async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      results: {
        daily_digest: { success: true },
      },
    });
  }
);

// Get usage logs (for today stats fallback)
export const getUsageLogsHandler = http.get(
  `${API_BASE}/children/:childId/usage-logs`,
  async () => {
    await delay(50);
    return HttpResponse.json({
      logs: [
        { wordCount: 15, sessionDurationSeconds: 300 },
        { wordCount: 20, sessionDurationSeconds: 450 },
        { wordCount: 12, sessionDurationSeconds: 200 },
      ],
    });
  }
);

// Get insights
export const getInsightsHandler = http.get(
  `${API_BASE}/children/:childId/insights`,
  async () => {
    await delay(50);
    return HttpResponse.json({
      insights: mockDashboardSummary.insights,
    });
  }
);

// =============================================================================
// EMPTY STATE HANDLERS
// =============================================================================

export const emptyChildrenHandler = http.get(`${API_BASE}/children`, async () => {
  await delay(50);
  return HttpResponse.json({ children: [] });
});

export const emptyDashboardHandler = http.get(
  `${API_BASE}/children/:childId/dashboard`,
  async ({ params }) => {
    await delay(50);
    return HttpResponse.json({
      data: {
        ...mockEmptyDashboard,
        child: {
          ...mockEmptyDashboard.child,
          id: params.childId as string,
        },
      },
    });
  }
);

export const emptyTodayHandler = http.get(
  `${API_BASE}/children/:childId/today`,
  async () => {
    await delay(50);
    return HttpResponse.json({
      data: {
        sessionsLogged: 0,
        wordsUsed: 0,
        communicationAttempts: 0,
      },
    });
  }
);

// =============================================================================
// ERROR HANDLERS
// =============================================================================

export const dashboardErrorHandlers = {
  // Server errors
  childrenServerError: http.get(`${API_BASE}/children`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }),

  dashboardServerError: http.get(
    `${API_BASE}/children/:childId/dashboard`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { message: "Internal server error", code: "SERVER_ERROR" },
        { status: 500 }
      );
    }
  ),

  // Auth errors
  unauthorized: http.get(`${API_BASE}/children`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }),

  // Not found
  childNotFound: http.get(
    `${API_BASE}/children/:childId/dashboard`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { message: "Child not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
  ),

  // Refresh failure
  refreshFailed: http.post(
    `${API_BASE}/children/:childId/insights/refresh`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { 
          success: false, 
          results: { 
            daily_digest: { success: false, error: "API rate limit exceeded" } 
          } 
        },
        { status: 200 }
      );
    }
  ),

  // Network error
  networkError: http.get(`${API_BASE}/children`, async () => {
    await delay(50);
    return HttpResponse.error();
  }),
};

// =============================================================================
// LOADING STATES
// =============================================================================

export const slowHandlers = {
  slowChildren: http.get(`${API_BASE}/children`, async () => {
    await delay(2000);
    return HttpResponse.json({ children: mockChildren });
  }),

  slowDashboard: http.get(
    `${API_BASE}/children/:childId/dashboard`,
    async ({ params }) => {
      await delay(2000);
      return HttpResponse.json({
        data: {
          ...mockDashboardSummary,
          child: { ...mockDashboardSummary.child, id: params.childId },
        },
      });
    }
  ),
};

// =============================================================================
// DEFAULT HANDLERS
// =============================================================================

export const dashboardHandlers = [
  listChildrenHandler,
  getDashboardHandler,
  getTodayHandler,
  refreshInsightsHandler,
  getUsageLogsHandler,
  getInsightsHandler,
];
