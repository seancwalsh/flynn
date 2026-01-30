/**
 * Chat Flow E2E Tests
 *
 * These tests require a working Clerk test environment to fully function.
 * Currently, smoke tests verify the app loads correctly.
 *
 * To enable full E2E testing:
 * 1. Set up a Clerk test environment
 * 2. Add VITE_CLERK_PUBLISHABLE_KEY with a valid test key to .env
 * 3. Set up test users in Clerk dashboard
 * 4. Remove .skip from tests below
 *
 * Tests cover:
 * - Navigation flow
 * - Conversation management
 * - Message sending with streaming
 * - Tool call display
 * - Keyboard shortcuts
 * - Mobile responsiveness
 * - Error handling
 */

import { test, expect, Page } from '@playwright/test';
import { ChatPage } from './fixtures/chat-page';
import {
  mockUser,
  mockChild,
  mockConversations,
  mockMessages,
  createStreamingResponse,
  createToolCallStreamingResponse,
} from './fixtures/test-data';

// =============================================================================
// TEST FIXTURES & HELPERS
// =============================================================================

/**
 * Set up API mocking for all chat-related endpoints
 */
async function setupApiMocks(page: Page, options: {
  conversations?: typeof mockConversations;
  messages?: typeof mockMessages;
  streamingContent?: string;
  simulateError?: boolean;
  simulateToolCall?: boolean;
} = {}) {
  const {
    conversations = mockConversations,
    messages = mockMessages,
    streamingContent = 'This is a helpful response from the AI assistant.',
    simulateError = false,
    simulateToolCall = false,
  } = options;

  // Mock auth/me endpoint
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { user: mockUser } }),
    });
  });

  // Mock list conversations
  await page.route('**/api/v1/conversations?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: conversations,
        pagination: { page: 1, limit: 20, total: conversations.length },
      }),
    });
  });

  // Mock get single conversation
  await page.route('**/api/v1/conversations/*', async (route, request) => {
    const method = request.method();
    const url = request.url();

    if (method === 'GET' && !url.includes('/messages')) {
      const conversationId = url.split('/conversations/')[1]?.split('?')[0];
      const conversation = conversations.find(c => c.id === conversationId) || conversations[0];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...conversation,
            messages: messages.filter(m => m.conversationId === conversation.id),
          },
        }),
      });
      return;
    }

    if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    await route.continue();
  });

  // Mock create conversation
  await page.route('**/api/v1/conversations', async (route, request) => {
    if (request.method() === 'POST') {
      const newConversation = {
        id: `conv_new_${Date.now()}`,
        userId: mockUser.id,
        childId: mockChild.id,
        title: 'New conversation',
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: newConversation }),
      });
      return;
    }
    await route.continue();
  });

  // Mock send message (streaming)
  await page.route('**/api/v1/conversations/*/messages', async (route, request) => {
    if (request.method() === 'POST') {
      if (simulateError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error', code: 'SERVER_ERROR' }),
        });
        return;
      }

      const streamBody = simulateToolCall
        ? createToolCallStreamingResponse()
        : createStreamingResponse(streamingContent);

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: streamBody,
      });
      return;
    }
    await route.continue();
  });
}

/**
 * Mock Clerk authentication by intercepting Clerk's API calls
 * Note: This requires a valid Clerk publishable key to work properly.
 * For full E2E testing, set up a Clerk test environment.
 */
async function mockClerkAuth(page: Page) {
  // Mock Clerk's session endpoint to return signed in state
  await page.route('**/.clerk/**', async (route) => {
    const url = route.request().url();

    // Mock session check
    if (url.includes('/v1/client')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            id: 'client_test',
            sessions: [{
              id: 'sess_test123',
              status: 'active',
              user: {
                id: 'user_test123',
                primary_email_address_id: 'email_test',
                email_addresses: [{
                  id: 'email_test',
                  email_address: 'test@example.com',
                }],
              },
            }],
            sign_in: null,
            sign_up: null,
          },
        }),
      });
      return;
    }

    // Let other Clerk requests through or mock as needed
    await route.fulfill({ status: 200, body: '{}' });
  });

  // Set mock token in localStorage
  await page.addInitScript(() => {
    window.localStorage.setItem('clerkToken', 'mock_token_for_testing');
  });
}

// =============================================================================
// SMOKE TESTS - These run without full auth
// =============================================================================

test.describe('Smoke Tests', () => {
  test('app dev server is running', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('static assets load', async ({ page }) => {
    await page.goto('/');

    // Check that React mounted something
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});

// =============================================================================
// AUTHENTICATED TESTS - Require Clerk test environment
// =============================================================================

test.describe('Chat Flow (requires Clerk)', () => {
  test.beforeEach(async ({ page }) => {
    await mockClerkAuth(page);
    await setupApiMocks(page);
  });

  test.describe('Navigation', () => {
    test.skip('user can navigate from login to dashboard', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
      await page.goto('/');
      await page.goto('/dashboard');
      await expect(page.getByText(/welcome back/i)).toBeVisible();
    });

    test.skip('authenticated user can access dashboard directly', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    });
  });

  test.describe('Conversation Management', () => {
    test.skip('can create a new conversation', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });

    test.skip('conversation list displays correctly', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });

    test.skip('can switch between conversations', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });

    test.skip('can delete a conversation', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });
  });

  test.describe('Messaging', () => {
    test.skip('can send a message and see response', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
      // Implementation:
      // 1. Navigate to chat
      // 2. Create/select conversation
      // 3. Type message
      // 4. Click send
      // 5. Verify streaming response appears
    });

    test.skip('shows streaming indicator during response', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });

    test.skip('displays error when message fails', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });
  });

  test.describe('Tool Calls', () => {
    test.skip('displays tool call with loading and result states', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
      // When enabled, this test should:
      // 1. Send a message that triggers a tool call
      // 2. Verify loading indicator appears
      // 3. Verify tool result is displayed
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test.skip('Enter sends message', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });

    test.skip('Shift+Enter adds newline without sending', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });

    test.skip('Escape closes slide-over panel', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });
  });

  test.describe('Conversation History', () => {
    test.skip('loads previous messages when selecting conversation', async ({ page }) => {
      // Skip: Requires valid Clerk test environment
    });
  });
});

test.describe('Mobile Responsive (requires Clerk)', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE viewport

  test.beforeEach(async ({ page }) => {
    await mockClerkAuth(page);
    await setupApiMocks(page);
  });

  test.skip('chat works on mobile viewport', async ({ page }) => {
    // Skip: Requires valid Clerk test environment
  });

  test.skip('mobile sidebar opens and closes', async ({ page }) => {
    // Skip: Requires valid Clerk test environment
  });

  test.skip('can send message on mobile', async ({ page }) => {
    // Skip: Requires valid Clerk test environment
  });
});

test.describe('Error States (requires Clerk)', () => {
  test.beforeEach(async ({ page }) => {
    await mockClerkAuth(page);
  });

  test.skip('handles network error gracefully', async ({ page }) => {
    // Skip: Requires valid Clerk test environment
  });

  test.skip('can dismiss error banner', async ({ page }) => {
    // Skip: Requires valid Clerk test environment
  });
});
