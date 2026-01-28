/**
 * MSW handlers for insights endpoints
 */

import { http, HttpResponse, delay } from "msw";

const API_BASE = "http://localhost:3000/api/v1";

// Mock insight data
export const mockInsights = [
  {
    id: "insight-1",
    childId: "child-1",
    type: "alert",
    severity: "warning",
    title: "Usage Drop Detected",
    summary: "Communication frequency has decreased by 30% this week",
    details: "Based on session data, your child used fewer symbols this week compared to last week.",
    category: "engagement",
    isRead: false,
    isDismissed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "insight-2",
    childId: "child-1",
    type: "milestone",
    severity: "info",
    title: "New Milestone Reached",
    summary: "Your child learned 5 new symbols this month",
    details: "Great progress! Keep encouraging daily practice.",
    category: "progress",
    isRead: true,
    isDismissed: false,
    createdAt: new Date().toISOString(),
  },
];

// List insights handler
export const listInsightsHandler = http.get(`${API_BASE}/insights`, async () => {
  await delay(50);
  return HttpResponse.json({
    data: mockInsights,
    pagination: {
      page: 1,
      limit: 20,
      total: mockInsights.length,
      totalPages: 1,
    },
  });
});

// Mark insight as read
export const markInsightReadHandler = http.patch(
  `${API_BASE}/insights/:id/read`,
  async ({ params }) => {
    await delay(50);
    return HttpResponse.json({
      data: { ...mockInsights[0], id: params.id, isRead: true },
    });
  }
);

// Dismiss insight
export const dismissInsightHandler = http.patch(
  `${API_BASE}/insights/:id/dismiss`,
  async ({ params }) => {
    await delay(50);
    return HttpResponse.json({
      data: { ...mockInsights[0], id: params.id, isDismissed: true },
    });
  }
);

// Error handlers
export const insightsErrorHandlers = {
  listServerError: http.get(`${API_BASE}/insights`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }),

  listUnauthorized: http.get(`${API_BASE}/insights`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }),
};

// Default handlers
export const insightsHandlers = [
  listInsightsHandler,
  markInsightReadHandler,
  dismissInsightHandler,
];
