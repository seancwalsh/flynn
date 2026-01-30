/**
 * Chat Page Object Model
 * 
 * Encapsulates chat page interactions for cleaner tests.
 */

import { Page, Locator, expect } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  
  // Sidebar / Conversation List
  readonly sidebar: Locator;
  readonly newConversationButton: Locator;
  readonly conversationItems: Locator;
  readonly mobileSidebarButton: Locator;
  readonly mobileSidebarOverlay: Locator;
  
  // Chat Area
  readonly chatHeader: Locator;
  readonly messageList: Locator;
  readonly messages: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  
  // Input
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly stopButton: Locator;
  
  // Error
  readonly errorBanner: Locator;
  readonly dismissErrorButton: Locator;
  
  // Empty State
  readonly emptyState: Locator;
  readonly startNewConversationButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Sidebar
    this.sidebar = page.locator('[class*="border-r"]').first();
    this.newConversationButton = page.getByRole('button', { name: /new conversation/i });
    this.conversationItems = page.locator('[data-testid="conversation-item"]');
    this.mobileSidebarButton = page.getByRole('button', { name: /open conversations/i });
    this.mobileSidebarOverlay = page.locator('[class*="bg-black/50"]');
    
    // Chat Area
    this.chatHeader = page.locator('h1').filter({ hasText: /chat|conversation/i });
    this.messageList = page.locator('[class*="flex-1"]').filter({ has: page.locator('[class*="message"]') });
    this.messages = page.locator('[data-testid^="message-"]');
    this.userMessages = page.locator('[data-testid="message-user"]');
    this.assistantMessages = page.locator('[data-testid="message-assistant"]');
    
    // Input
    this.messageInput = page.getByRole('textbox', { name: /message input/i });
    this.sendButton = page.getByRole('button', { name: /send message/i });
    this.stopButton = page.getByRole('button', { name: /stop generating/i });
    
    // Error
    this.errorBanner = page.locator('[class*="bg-red-50"]');
    this.dismissErrorButton = page.getByRole('button', { name: /dismiss error/i });
    
    // Empty State
    this.emptyState = page.getByText(/select a conversation or start a new one/i);
    this.startNewConversationButton = page.getByRole('button', { name: /start new conversation/i });
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoChat(childId = 'child_test123') {
    // Assuming chat is accessible from dashboard or via direct route
    // This might need adjustment based on actual routing
    await this.page.goto(`/dashboard?childId=${childId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async createNewConversation() {
    await this.newConversationButton.click();
    await this.page.waitForResponse(resp => 
      resp.url().includes('/conversations') && resp.request().method() === 'POST'
    );
  }

  async selectConversation(index: number) {
    await this.conversationItems.nth(index).click();
    await this.page.waitForResponse(resp => 
      resp.url().includes('/conversations/') && resp.request().method() === 'GET'
    );
  }

  async selectConversationByTitle(title: string) {
    await this.page.getByText(title).click();
    await this.page.waitForResponse(resp => 
      resp.url().includes('/conversations/') && resp.request().method() === 'GET'
    );
  }

  async deleteConversation(index: number) {
    const conversation = this.conversationItems.nth(index);
    const deleteButton = conversation.getByRole('button', { name: /delete/i });
    await deleteButton.click();
    
    // Confirm delete if there's a confirmation dialog
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  async sendMessage(content: string) {
    await this.messageInput.fill(content);
    await this.sendButton.click();
  }

  async sendMessageWithEnter(content: string) {
    await this.messageInput.fill(content);
    await this.messageInput.press('Enter');
  }

  async addNewlineAndSend(content: string) {
    await this.messageInput.fill(content);
    await this.messageInput.press('Shift+Enter');
    await this.messageInput.type('More text');
    await this.sendButton.click();
  }

  async stopStreaming() {
    await this.stopButton.click();
  }

  async openMobileSidebar() {
    await this.mobileSidebarButton.click();
    await expect(this.mobileSidebarOverlay).toBeVisible();
  }

  async closeMobileSidebar() {
    await this.mobileSidebarOverlay.click();
    await expect(this.mobileSidebarOverlay).not.toBeVisible();
  }

  async waitForStreamingToComplete() {
    // Wait for stop button to disappear (streaming done)
    await expect(this.stopButton).not.toBeVisible({ timeout: 30000 });
  }

  async expectMessageCount(count: number) {
    await expect(this.messages).toHaveCount(count);
  }

  async expectConversationCount(count: number) {
    await expect(this.conversationItems).toHaveCount(count);
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorBanner).toBeVisible();
    await expect(this.errorBanner).toContainText(message);
  }

  async dismissError() {
    await this.dismissErrorButton.click();
    await expect(this.errorBanner).not.toBeVisible();
  }

  async expectNoError() {
    await expect(this.errorBanner).not.toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectChatLoaded() {
    await expect(this.messageInput).toBeVisible();
  }

  getLastMessage() {
    return this.messages.last();
  }

  getLastAssistantMessage() {
    return this.assistantMessages.last();
  }

  getLastUserMessage() {
    return this.userMessages.last();
  }
}
