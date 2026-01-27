/**
 * Conversations API Integration Tests
 * 
 * Tests the full conversation flow with Claude integration.
 * Uses mocked Claude client for predictable testing.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { app } from "../../app";
import { setupTestDatabase, cleanTestData, closeTestDb, teardownTestDatabase, getTestDb } from "../setup";
import { families, caregivers, children, conversations, conversationMessages } from "../../db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonResponse = { data?: any; code?: string; message?: string };

// ============================================================================
// Test Setup
// ============================================================================

let testCaregiver: { id: string };
let testChild: { id: string };

beforeAll(async () => {
  process.env["DATABASE_URL"] = process.env["TEST_DATABASE_URL"] ??
    "postgres://postgres:postgres@localhost:5433/flynn_aac_test";
  process.env["NODE_ENV"] = "test";
  
  // Ensure no Anthropic API key for consistent testing
  delete process.env["ANTHROPIC_API_KEY"];

  await setupTestDatabase();
  
  // Create conversation tables
  const db = getTestDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      child_id UUID REFERENCES children(id) ON DELETE SET NULL,
      title VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      tool_name VARCHAR(100),
      tool_call_id VARCHAR(100),
      input_tokens INTEGER,
      output_tokens INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
});

beforeEach(async () => {
  await cleanTestData();
  
  // Also clean conversation tables
  const db = getTestDb();
  await db.execute(`TRUNCATE conversation_messages CASCADE`);
  await db.execute(`TRUNCATE conversations CASCADE`);

  // Create test data
  const [family] = await db.insert(families).values({
    name: "Test Family",
  }).returning();

  if (!family) throw new Error("Failed to create test family");

  const [caregiver] = await db.insert(caregivers).values({
    familyId: family.id,
    name: "Test Parent",
    email: "parent@test.com",
    role: "parent",
  }).returning();

  if (!caregiver) throw new Error("Failed to create test caregiver");
  testCaregiver = caregiver;

  const [child] = await db.insert(children).values({
    familyId: family.id,
    name: "Test Child",
    birthDate: "2021-01-15",
  }).returning();

  if (!child) throw new Error("Failed to create test child");
  testChild = child;
});

afterAll(async () => {
  const db = getTestDb();
  await db.execute(`DROP TABLE IF EXISTS conversation_messages CASCADE`);
  await db.execute(`DROP TABLE IF EXISTS conversations CASCADE`);
  await teardownTestDatabase();
  await closeTestDb();
});

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/v1/conversations", () => {
  test("creates a new conversation", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caregiverId: testCaregiver.id,
        childId: testChild.id,
        title: "Test Conversation",
      }),
    });

    expect(res.status).toBe(201);
    
    const body = await res.json() as JsonResponse;
    expect(body.data.id).toBeDefined();
    expect(body.data.caregiverId).toBe(testCaregiver.id);
    expect(body.data.childId).toBe(testChild.id);
    expect(body.data.title).toBe("Test Conversation");
  });

  test("creates conversation without title", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caregiverId: testCaregiver.id,
      }),
    });

    expect(res.status).toBe(201);
    
    const body = await res.json() as JsonResponse;
    expect(body.data.id).toBeDefined();
    expect(body.data.title).toBeNull();
  });

  test("returns 404 for non-existent caregiver", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caregiverId: "00000000-0000-0000-0000-000000000000",
      }),
    });

    expect(res.status).toBe(404);
    
    const body = await res.json() as JsonResponse;
    expect(body.code).toBe("CAREGIVER_NOT_FOUND");
  });

  test("returns 404 for non-existent child", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caregiverId: testCaregiver.id,
        childId: "00000000-0000-0000-0000-000000000000",
      }),
    });

    expect(res.status).toBe(404);
    
    const body = await res.json() as JsonResponse;
    expect(body.code).toBe("CHILD_NOT_FOUND");
  });

  test("validates input", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caregiverId: "not-a-uuid",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/conversations", () => {
  test("lists conversations for caregiver", async () => {
    const db = getTestDb();
    
    // Create some conversations
    await db.insert(conversations).values([
      { caregiverId: testCaregiver.id, title: "Conversation 1" },
      { caregiverId: testCaregiver.id, title: "Conversation 2" },
    ]);

    const res = await app.request(
      `/api/v1/conversations?caregiverId=${testCaregiver.id}`,
      { method: "GET" }
    );

    expect(res.status).toBe(200);
    
    const body = await res.json() as JsonResponse;
    expect(body.data).toHaveLength(2);
  });

  test("filters by child ID", async () => {
    const db = getTestDb();
    
    await db.insert(conversations).values([
      { caregiverId: testCaregiver.id, childId: testChild.id, title: "With Child" },
      { caregiverId: testCaregiver.id, title: "Without Child" },
    ]);

    const res = await app.request(
      `/api/v1/conversations?caregiverId=${testCaregiver.id}&childId=${testChild.id}`,
      { method: "GET" }
    );

    expect(res.status).toBe(200);
    
    const body = await res.json() as JsonResponse;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("With Child");
  });

  test("supports pagination", async () => {
    const db = getTestDb();
    
    // Create 5 conversations
    for (let i = 1; i <= 5; i++) {
      await db.insert(conversations).values({
        caregiverId: testCaregiver.id,
        title: `Conversation ${i}`,
      });
    }

    const res = await app.request(
      `/api/v1/conversations?caregiverId=${testCaregiver.id}&limit=2&offset=2`,
      { method: "GET" }
    );

    expect(res.status).toBe(200);
    
    const body = await res.json() as JsonResponse;
    expect(body.data).toHaveLength(2);
  });
});

describe("GET /api/v1/conversations/:id", () => {
  test("returns conversation with messages", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
      title: "Test Conversation",
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    await db.insert(conversationMessages).values([
      { conversationId: conv.id, role: "user", content: "Hello" },
      { conversationId: conv.id, role: "assistant", content: "Hi there!" },
    ]);

    const res = await app.request(`/api/v1/conversations/${conv.id}`, {
      method: "GET",
    });

    expect(res.status).toBe(200);
    
    const body = await res.json() as JsonResponse;
    expect(body.data.id).toBe(conv.id);
    expect(body.data.title).toBe("Test Conversation");
    expect(body.data.messages).toHaveLength(2);
  });

  test("returns 404 for non-existent conversation", async () => {
    const res = await app.request(
      "/api/v1/conversations/00000000-0000-0000-0000-000000000000",
      { method: "GET" }
    );

    expect(res.status).toBe(404);
    
    const body = await res.json() as JsonResponse;
    expect(body.code).toBe("CONVERSATION_NOT_FOUND");
  });
});

describe("POST /api/v1/conversations/:id/messages", () => {
  test("sends message and gets mock response (no API key)", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
      childId: testChild.id,
      title: "Test Conversation",
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    const res = await app.request(`/api/v1/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello Flynn!",
      }),
    });

    expect(res.status).toBe(200);
    
    const body = await res.json() as JsonResponse;
    expect(body.data.userMessage).toBeDefined();
    expect(body.data.assistantMessage).toBeDefined();
    expect(body.data.assistantMessage.content).toContain("not configured");
  });

  test("persists messages to database", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    await app.request(`/api/v1/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Test message",
      }),
    });

    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conv.id));

    expect(messages.length).toBe(2); // user + assistant
    expect(messages.find(m => m.role === "user")?.content).toBe("Test message");
    expect(messages.find(m => m.role === "assistant")).toBeDefined();
  });

  test("generates title from first message", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    await app.request(`/api/v1/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How is Emma doing with her vocabulary?",
      }),
    });

    const [updated] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conv.id));

    expect(updated?.title).toBe("How is Emma doing with her vocabulary?");
  });

  test("returns 404 for non-existent conversation", async () => {
    const res = await app.request(
      "/api/v1/conversations/00000000-0000-0000-0000-000000000000/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Hello",
        }),
      }
    );

    expect(res.status).toBe(404);
  });

  test("validates message content", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    // Empty content
    const res = await app.request(`/api/v1/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/conversations/:id", () => {
  test("deletes a conversation", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
      title: "To Delete",
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    const res = await app.request(`/api/v1/conversations/${conv.id}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    
    // Verify deleted
    const remaining = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conv.id));
    
    expect(remaining).toHaveLength(0);
  });

  test("returns 404 for non-existent conversation", async () => {
    const res = await app.request(
      "/api/v1/conversations/00000000-0000-0000-0000-000000000000",
      { method: "DELETE" }
    );

    expect(res.status).toBe(404);
  });

  test("cascades delete to messages", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    await db.insert(conversationMessages).values([
      { conversationId: conv.id, role: "user", content: "Hello" },
      { conversationId: conv.id, role: "assistant", content: "Hi!" },
    ]);

    await app.request(`/api/v1/conversations/${conv.id}`, {
      method: "DELETE",
    });

    const remainingMessages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conv.id));
    
    expect(remainingMessages).toHaveLength(0);
  });
});

describe("GET /api/v1/conversations/:id/messages", () => {
  test("returns paginated messages", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    // Create 10 messages
    for (let i = 1; i <= 10; i++) {
      await db.insert(conversationMessages).values({
        conversationId: conv.id,
        role: i % 2 === 1 ? "user" : "assistant",
        content: `Message ${i}`,
      });
    }

    const res = await app.request(
      `/api/v1/conversations/${conv.id}/messages?limit=5&offset=0`,
      { method: "GET" }
    );

    expect(res.status).toBe(200);
    
    const body = await res.json() as JsonResponse;
    expect(body.data).toHaveLength(5);
  });

  test("returns 404 for non-existent conversation", async () => {
    const res = await app.request(
      "/api/v1/conversations/00000000-0000-0000-0000-000000000000/messages",
      { method: "GET" }
    );

    expect(res.status).toBe(404);
  });
});

describe("Conversation message history", () => {
  test("preserves message order", async () => {
    const db = getTestDb();
    
    const [conv] = await db.insert(conversations).values({
      caregiverId: testCaregiver.id,
    }).returning();

    if (!conv) throw new Error("Failed to create conversation");

    // Send multiple messages
    for (const content of ["First", "Second", "Third"]) {
      await app.request(`/api/v1/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    }

    const res = await app.request(`/api/v1/conversations/${conv.id}`, {
      method: "GET",
    });

    const body = await res.json() as JsonResponse;
    const userMessages = body.data.messages.filter((m: { role: string }) => m.role === "user");
    
    expect(userMessages[0].content).toBe("First");
    expect(userMessages[1].content).toBe("Second");
    expect(userMessages[2].content).toBe("Third");
  });
});
