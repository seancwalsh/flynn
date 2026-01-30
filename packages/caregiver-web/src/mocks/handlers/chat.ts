/**
 * MSW handlers for chat/conversation endpoints
 */

import { http, HttpResponse, delay } from "msw";
import type { Conversation, Message } from "~/components/chat/types";

const API_BASE = "http://localhost:3000/api/v1";

// Mock data
export const mockConversation: Conversation = {
  id: "conv-123",
  childId: "child-123",
  userId: "user-123",
  title: "Test Conversation",
  messageCount: 2,
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
};

export const mockMessage: Message = {
  id: "msg-123",
  conversationId: "conv-123",
  role: "assistant",
  content: "Hello! How can I help you today?",
  model: "gpt-4",
  toolCalls: null,
  toolResults: null,
  tokenUsage: null,
  metadata: null,
  createdAt: new Date().toISOString(),
};

// Success handlers
export const listConversationsHandler = http.get(
  `${API_BASE}/conversations`,
  async () => {
    await delay(50);
    return HttpResponse.json({
      data: [mockConversation],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  }
);

export const getConversationHandler = http.get(
  `${API_BASE}/conversations/:id`,
  async ({ params }) => {
    await delay(50);
    return HttpResponse.json({
      data: {
        ...mockConversation,
        id: params.id,
        messages: [mockMessage],
      },
    });
  }
);

export const createConversationHandler = http.post(
  `${API_BASE}/conversations`,
  async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { childId: string; title?: string };
    return HttpResponse.json({
      data: {
        ...mockConversation,
        id: `conv-${Date.now()}`,
        childId: body.childId,
        title: body.title || "New Conversation",
      },
    });
  }
);

export const sendMessageHandler = http.post(
  `${API_BASE}/conversations/:conversationId/messages`,
  async () => {
    await delay(50);
    return HttpResponse.json({
      data: {
        ...mockMessage,
        id: `msg-${Date.now()}`,
      },
    });
  }
);

export const deleteConversationHandler = http.delete(
  `${API_BASE}/conversations/:id`,
  async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }
);

// Error scenario handlers
export const chatErrorHandlers = {
  listUnauthorized: http.get(`${API_BASE}/conversations`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }),

  listForbidden: http.get(`${API_BASE}/conversations`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }),

  listServerError: http.get(`${API_BASE}/conversations`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }),

  listNetworkError: http.get(`${API_BASE}/conversations`, () => {
    return HttpResponse.error();
  }),

  getUnauthorized: http.get(`${API_BASE}/conversations/:id`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }),

  getNotFound: http.get(`${API_BASE}/conversations/:id`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Conversation not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }),

  getServerError: http.get(`${API_BASE}/conversations/:id`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }),

  sendMessageUnauthorized: http.post(
    `${API_BASE}/conversations/:conversationId/messages`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { message: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
  ),

  sendMessageServerError: http.post(
    `${API_BASE}/conversations/:conversationId/messages`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { message: "Internal server error", code: "SERVER_ERROR" },
        { status: 500 }
      );
    }
  ),

  sendMessageNetworkError: http.post(
    `${API_BASE}/conversations/:conversationId/messages`,
    () => {
      return HttpResponse.error();
    }
  ),

  createConversationServerError: http.post(
    `${API_BASE}/conversations`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { message: "Internal server error", code: "SERVER_ERROR" },
        { status: 500 }
      );
    }
  ),

  deleteConversationServerError: http.delete(
    `${API_BASE}/conversations/:id`,
    async () => {
      await delay(50);
      return HttpResponse.json(
        { message: "Internal server error", code: "SERVER_ERROR" },
        { status: 500 }
      );
    }
  ),
};

// Default handlers array
export const chatHandlers = [
  listConversationsHandler,
  getConversationHandler,
  createConversationHandler,
  sendMessageHandler,
  deleteConversationHandler,
];
