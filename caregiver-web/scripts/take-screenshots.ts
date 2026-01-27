/**
 * Screenshot Capture Script for Flynn AAC Caregiver Web
 *
 * Uses Playwright to capture screenshots of the app for documentation.
 *
 * Usage:
 *   npx tsx scripts/take-screenshots.ts
 *
 * Prerequisites:
 *   1. Dev server running: npm run dev
 *   2. Valid Clerk publishable key in .env (VITE_CLERK_PUBLISHABLE_KEY)
 *      - Without a valid Clerk key, the app will render blank pages
 *      - Get a test key from your Clerk dashboard
 *
 * Output:
 *   /home/clawdbot/clawd/flynn/screenshots/
 *
 * Known Limitations:
 *   - Public pages (landing, login) render but may show loading states
 *     without valid Clerk credentials
 *   - Authenticated pages (dashboard, chat) require either:
 *     a) A valid Clerk test environment, or
 *     b) Manual screenshots with a logged-in session
 *   - Chat is a slide-over component, not a standalone route, so
 *     capturing it requires triggering the UI interaction
 */

import { chromium, Page, Browser } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOT_DIR = "/home/clawdbot/clawd/flynn/screenshots";
const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

// =============================================================================
// MOCK DATA
// =============================================================================

const mockUser = {
  id: "user_demo123",
  email: "demo@flynnapp.com",
  role: "caregiver",
  createdAt: "2024-01-01T00:00:00Z",
};

const mockChild = {
  id: "child_demo123",
  name: "Alex",
  age: 6,
};

const mockConversations = [
  {
    id: "conv_1",
    userId: mockUser.id,
    childId: mockChild.id,
    title: "Symbol learning tips",
    messageCount: 4,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T12:30:00Z",
    deletedAt: null,
  },
  {
    id: "conv_2",
    userId: mockUser.id,
    childId: mockChild.id,
    title: "Daily progress check",
    messageCount: 2,
    createdAt: "2024-01-14T09:00:00Z",
    updatedAt: "2024-01-14T11:00:00Z",
    deletedAt: null,
  },
  {
    id: "conv_3",
    userId: mockUser.id,
    childId: mockChild.id,
    title: "Communication strategies",
    messageCount: 6,
    createdAt: "2024-01-13T08:00:00Z",
    updatedAt: "2024-01-13T09:00:00Z",
    deletedAt: null,
  },
];

const mockMessagesEmpty: unknown[] = [];

const mockMessagesConversation = [
  {
    id: "msg_1",
    conversationId: "conv_1",
    role: "user",
    content: "How can I help Alex learn new symbols faster?",
    model: null,
    toolCalls: null,
    toolResults: null,
    tokenUsage: null,
    metadata: null,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "msg_2",
    conversationId: "conv_1",
    role: "assistant",
    content:
      "Here are some effective strategies for helping Alex learn new symbols:\n\n**1. Start with motivating words**\nBegin with symbols for things Alex loves - favorite foods, toys, or activities. Motivation is key!\n\n**2. Use repetition naturally**\nModel the symbols consistently throughout the day. Pair them with the spoken word every time.\n\n**3. Create opportunities**\nSet up situations where Alex needs to use the symbols - like during snack time or play.\n\n**4. Celebrate success**\nEven approximations or attempts deserve praise. This builds confidence!\n\nWould you like me to suggest specific symbols to start with based on Alex's profile?",
    model: "claude-3-5-sonnet",
    toolCalls: null,
    toolResults: null,
    tokenUsage: { promptTokens: 100, completionTokens: 180, totalTokens: 280 },
    metadata: null,
    createdAt: "2024-01-15T10:00:30Z",
  },
  {
    id: "msg_3",
    conversationId: "conv_1",
    role: "user",
    content: "Yes please! What symbols should we focus on this week?",
    model: null,
    toolCalls: null,
    toolResults: null,
    tokenUsage: null,
    metadata: null,
    createdAt: "2024-01-15T12:30:00Z",
  },
  {
    id: "msg_4",
    conversationId: "conv_1",
    role: "assistant",
    content:
      "Based on Alex's current progress and common communication needs, I recommend focusing on these 5 core symbols this week:\n\n• **more** - Great for requesting during activities\n• **help** - Builds independence and self-advocacy\n• **all done** - Important for transitions\n• **play** - Motivating for Alex based on the activity log\n• **want** - Opens up lots of sentence combinations\n\nTip: Try to use each symbol at least 10 times per day in natural contexts. I can send you daily reminders if that would help!",
    model: "claude-3-5-sonnet",
    toolCalls: null,
    toolResults: null,
    tokenUsage: { promptTokens: 150, completionTokens: 140, totalTokens: 290 },
    metadata: null,
    createdAt: "2024-01-15T12:31:00Z",
  },
];

const mockMessagesWithToolCall = [
  {
    id: "msg_1",
    conversationId: "conv_1",
    role: "user",
    content: "How has Alex been doing this week?",
    model: null,
    toolCalls: null,
    toolResults: null,
    tokenUsage: null,
    metadata: null,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "msg_2",
    conversationId: "conv_1",
    role: "assistant",
    content: "Let me look up Alex's progress for this week...",
    model: "claude-3-5-sonnet",
    toolCalls: [
      {
        id: "tc_1",
        type: "function",
        name: "get_child_progress",
        arguments: { childId: mockChild.id, period: "week" },
      },
    ],
    toolResults: [
      {
        toolCallId: "tc_1",
        content: {
          symbolsLearned: 8,
          totalSymbols: 42,
          sessionsCompleted: 12,
          avgSessionDuration: "15 min",
          mostUsedSymbols: ["more", "want", "play", "help", "eat"],
          streak: 5,
        },
        isError: false,
      },
    ],
    tokenUsage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
    metadata: null,
    createdAt: "2024-01-15T10:01:00Z",
  },
  {
    id: "msg_3",
    conversationId: "conv_1",
    role: "assistant",
    content:
      "Great news! Alex has had an excellent week:\n\n📈 **8 new symbols learned** (total: 42)\n⏱️ **12 practice sessions** averaging 15 minutes each\n🔥 **5-day streak** - amazing consistency!\n\nMost used symbols: more, want, play, help, eat\n\nAlex is really engaging with 'play' and 'more' - these seem to be highly motivating. Keep encouraging those!",
    model: "claude-3-5-sonnet",
    toolCalls: null,
    toolResults: null,
    tokenUsage: { promptTokens: 250, completionTokens: 100, totalTokens: 350 },
    metadata: null,
    createdAt: "2024-01-15T10:01:30Z",
  },
];

// =============================================================================
// HELPERS
// =============================================================================

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function waitForDevServer(maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
    process.stdout.write(".");
  }
  return false;
}

async function setupMocks(
  page: Page,
  options: {
    messages?: typeof mockMessagesConversation;
    conversations?: typeof mockConversations;
    emptyConversation?: boolean;
  } = {}
) {
  const {
    messages = mockMessagesConversation,
    conversations = mockConversations,
    emptyConversation = false,
  } = options;

  // Mock Clerk authentication
  await page.route("**/.clerk/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/v1/client")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          response: {
            id: "client_test",
            sessions: [
              {
                id: "sess_demo",
                status: "active",
                user: {
                  id: mockUser.id,
                  primary_email_address_id: "email_demo",
                  email_addresses: [
                    {
                      id: "email_demo",
                      email_address: mockUser.email,
                    },
                  ],
                },
              },
            ],
            sign_in: null,
            sign_up: null,
          },
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, body: "{}" });
  });

  // Mock auth/me endpoint
  await page.route("**/api/v1/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { user: mockUser } }),
    });
  });

  // Mock conversations list
  await page.route("**/api/v1/conversations?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: conversations,
        pagination: { page: 1, limit: 20, total: conversations.length },
      }),
    });
  });

  // Mock single conversation
  await page.route("**/api/v1/conversations/*", async (route, request) => {
    const method = request.method();
    const url = request.url();

    if (method === "GET" && !url.includes("/messages")) {
      const conversationId = url.split("/conversations/")[1]?.split("?")[0];
      const conversation =
        conversations.find((c) => c.id === conversationId) || conversations[0];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            ...conversation,
            messages: emptyConversation ? [] : messages,
          },
        }),
      });
      return;
    }

    if (method === "POST") {
      const newConv = {
        id: `conv_new_${Date.now()}`,
        userId: mockUser.id,
        childId: mockChild.id,
        title: "New conversation",
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: newConv }),
      });
      return;
    }

    await route.continue();
  });

  // Inject mock auth state
  await page.addInitScript(() => {
    window.localStorage.setItem("clerkToken", "mock_demo_token");
    window.localStorage.setItem(
      "mockAuthState",
      JSON.stringify({ isAuthenticated: true })
    );
  });
}

// =============================================================================
// SCREENSHOT FUNCTIONS
// =============================================================================

async function captureLoginPage(browser: Browser) {
  console.log("\n📸 Capturing login page...");
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000); // Let animations settle

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "login-page.png"),
      fullPage: true,
    });
    console.log("   ✓ login-page.png");
  } finally {
    await page.close();
  }
}

async function captureLandingPage(browser: Browser) {
  console.log("\n📸 Capturing landing page...");
  const page = await browser.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "landing-page.png"),
      fullPage: true,
    });
    console.log("   ✓ landing-page.png");
  } finally {
    await page.close();
  }
}

async function captureDashboard(browser: Browser) {
  console.log("\n📸 Capturing dashboard...");
  const page = await browser.newPage();

  try {
    await setupMocks(page);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "dashboard.png"),
      fullPage: true,
    });
    console.log("   ✓ dashboard.png");
  } catch (error) {
    console.log(
      "   ⚠ dashboard.png - Could not capture (auth redirect likely)"
    );
    console.log(`     Error: ${error}`);
  } finally {
    await page.close();
  }
}

async function captureChatEmpty(browser: Browser) {
  console.log("\n📸 Capturing empty chat...");
  const page = await browser.newPage();

  try {
    await setupMocks(page, { emptyConversation: true, messages: [] });

    // Navigate to dashboard then try to open chat
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // For now, take dashboard screenshot as placeholder
    // The chat component is a slide-over that would need specific UI interaction
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "chat-empty.png"),
      fullPage: true,
    });
    console.log("   ✓ chat-empty.png (dashboard state - chat is slide-over)");
  } catch (error) {
    console.log("   ⚠ chat-empty.png - Could not capture");
    console.log(`     Error: ${error}`);
  } finally {
    await page.close();
  }
}

async function captureChatConversation(browser: Browser) {
  console.log("\n📸 Capturing chat with conversation...");
  const page = await browser.newPage();

  try {
    await setupMocks(page, { messages: mockMessagesConversation });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "chat-conversation.png"),
      fullPage: true,
    });
    console.log(
      "   ✓ chat-conversation.png (dashboard state - chat is slide-over)"
    );
  } catch (error) {
    console.log("   ⚠ chat-conversation.png - Could not capture");
    console.log(`     Error: ${error}`);
  } finally {
    await page.close();
  }
}

async function captureChatToolCall(browser: Browser) {
  console.log("\n📸 Capturing chat with tool call...");
  const page = await browser.newPage();

  try {
    await setupMocks(page, { messages: mockMessagesWithToolCall });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "chat-tool-call.png"),
      fullPage: true,
    });
    console.log(
      "   ✓ chat-tool-call.png (dashboard state - chat is slide-over)"
    );
  } catch (error) {
    console.log("   ⚠ chat-tool-call.png - Could not capture");
    console.log(`     Error: ${error}`);
  } finally {
    await page.close();
  }
}

async function captureChatMobile(browser: Browser) {
  console.log("\n📸 Capturing mobile chat view...");
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 }, // iPhone X viewport
  });

  try {
    await setupMocks(page, { messages: mockMessagesConversation });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "chat-mobile.png"),
      fullPage: true,
    });
    console.log("   ✓ chat-mobile.png");
  } catch (error) {
    console.log("   ⚠ chat-mobile.png - Could not capture");
    console.log(`     Error: ${error}`);
  } finally {
    await page.close();
  }
}

async function captureLandingMobile(browser: Browser) {
  console.log("\n📸 Capturing mobile landing page...");
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 }, // iPhone X viewport
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "landing-mobile.png"),
      fullPage: true,
    });
    console.log("   ✓ landing-mobile.png");
  } finally {
    await page.close();
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("🎬 Flynn AAC Screenshot Capture\n");
  console.log(`Output directory: ${SCREENSHOT_DIR}`);
  console.log(`Base URL: ${BASE_URL}`);

  // Ensure output directory exists
  await ensureDir(SCREENSHOT_DIR);

  // Check if dev server is running
  console.log("\n⏳ Waiting for dev server...");
  const serverReady = await waitForDevServer();

  if (!serverReady) {
    console.error("\n❌ Dev server not available at", BASE_URL);
    console.log("   Please start the dev server with: npm run dev");
    process.exit(1);
  }

  console.log(" ready!\n");

  // Launch browser
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // Capture all screenshots
    await captureLandingPage(browser);
    await captureLandingMobile(browser);
    await captureLoginPage(browser);
    await captureDashboard(browser);
    await captureChatEmpty(browser);
    await captureChatConversation(browser);
    await captureChatToolCall(browser);
    await captureChatMobile(browser);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📷 Screenshot capture complete!\n");

    const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith(".png"));
    console.log(`Captured ${files.length} screenshots:\n`);
    files.forEach((f) => {
      const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
      const size = (stats.size / 1024).toFixed(1);
      console.log(`  • ${f} (${size} KB)`);
    });

    console.log("\n📝 Notes:");
    console.log("  - Dashboard/chat screenshots require mocked authentication");
    console.log("  - Chat is a slide-over panel, not a separate route");
    console.log("  - For full chat screenshots, manual interaction or");
    console.log("    component isolation may be needed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
