/**
 * Conversations API Routes
 * 
 * Handles AI conversation management with Claude integration.
 * Features:
 * - Create/list/get conversations
 * - Send messages with SSE streaming responses
 * - Tool call execution within conversations
 * - Message history persistence
 */

import { Hono } from "hono";
import { z } from "zod/v4";
import { zValidator } from "@hono/zod-validator";
import { streamSSE } from "hono/streaming";
import { db } from "../../../db";
import { 
  conversations, 
  conversationMessages, 
  caregivers, 
  children,
} from "../../../db/schema";
import type { ConversationMessage } from "../../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { ClaudeService } from "../../../services/claude";
import { ToolExecutor } from "../../../services/tool-executor";
import { 
  buildFullContextPrompt, 
  generateConversationTitle,
} from "../../../services/prompts";
import type { 
  Message, 
  ContentBlock, 
  ToolUseContent,
  TokenUsage,
} from "../../../types/claude";
import { env } from "../../../config/env";

// ============================================================================
// Route Setup
// ============================================================================

export const conversationsRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createConversationSchema = z.object({
  caregiverId: z.uuid(),
  childId: z.uuid().optional(),
  title: z.string().max(255).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

const listConversationsQuerySchema = z.object({
  caregiverId: z.uuid(),
  childId: z.uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert database messages to Claude message format
 */
function dbMessagesToClaudeMessages(dbMessages: ConversationMessage[]): Message[] {
  const messages: Message[] = [];
  let currentAssistantContent: ContentBlock[] = [];
  let currentToolResults: ContentBlock[] = [];

  for (const msg of dbMessages) {
    if (msg.role === "user") {
      // Flush any pending assistant content
      if (currentAssistantContent.length > 0) {
        messages.push({ role: "assistant", content: currentAssistantContent });
        currentAssistantContent = [];
      }
      // Flush any pending tool results
      if (currentToolResults.length > 0) {
        messages.push({ role: "user", content: currentToolResults });
        currentToolResults = [];
      }
      messages.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      // Flush any pending tool results first
      if (currentToolResults.length > 0) {
        messages.push({ role: "user", content: currentToolResults });
        currentToolResults = [];
      }
      currentAssistantContent.push({ type: "text", text: msg.content });
    } else if (msg.role === "tool_call") {
      // Tool calls are part of assistant message
      try {
        const parsed = JSON.parse(msg.content) as { id: string; input: Record<string, unknown> };
        currentAssistantContent.push({
          type: "tool_use",
          id: parsed.id,
          name: msg.toolName ?? "unknown",
          input: parsed.input,
        });
      } catch {
        // Skip malformed tool calls
      }
    } else if (msg.role === "tool_result") {
      // Flush assistant content before tool results
      if (currentAssistantContent.length > 0) {
        messages.push({ role: "assistant", content: currentAssistantContent });
        currentAssistantContent = [];
      }
      currentToolResults.push({
        type: "tool_result",
        tool_use_id: msg.toolCallId ?? "",
        content: msg.content,
      });
    }
  }

  // Flush any remaining content
  if (currentAssistantContent.length > 0) {
    messages.push({ role: "assistant", content: currentAssistantContent });
  }
  if (currentToolResults.length > 0) {
    messages.push({ role: "user", content: currentToolResults });
  }

  return messages;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * Create a new conversation
 */
conversationsRoutes.post(
  "/",
  zValidator("json", createConversationSchema),
  async (c) => {
    const { caregiverId, childId, title } = c.req.valid("json");

    // Verify caregiver exists
    const [caregiver] = await db
      .select()
      .from(caregivers)
      .where(eq(caregivers.id, caregiverId));

    if (!caregiver) {
      throw new AppError("Caregiver not found", 404, "CAREGIVER_NOT_FOUND");
    }

    // Verify child exists if provided
    if (childId) {
      const [child] = await db
        .select()
        .from(children)
        .where(eq(children.id, childId));

      if (!child) {
        throw new AppError("Child not found", 404, "CHILD_NOT_FOUND");
      }

      // Verify child belongs to same family as caregiver
      if (child.familyId !== caregiver.familyId) {
        throw new AppError("Child does not belong to caregiver's family", 403, "UNAUTHORIZED");
      }
    }

    const [conversation] = await db
      .insert(conversations)
      .values({
        caregiverId,
        childId,
        title,
      })
      .returning();

    return c.json({ data: conversation }, 201);
  }
);

/**
 * List conversations for a caregiver
 */
conversationsRoutes.get(
  "/",
  zValidator("query", listConversationsQuerySchema),
  async (c) => {
    const { caregiverId, childId, limit, offset } = c.req.valid("query");

    const conditions = [eq(conversations.caregiverId, caregiverId)];
    if (childId) {
      conditions.push(eq(conversations.childId, childId));
    }

    const results = await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    return c.json({ data: results });
  }
);

/**
 * Get a single conversation with messages
 */
conversationsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  const messages = await db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, id))
    .orderBy(conversationMessages.createdAt);

  return c.json({
    data: {
      ...conversation,
      messages,
    },
  });
});

/**
 * Send a message to a conversation and stream Claude's response
 * Uses Server-Sent Events (SSE) for real-time streaming
 */
conversationsRoutes.post(
  "/:id/messages",
  zValidator("json", sendMessageSchema),
  async (c) => {
    const conversationId = c.req.param("id");
    const { content: userContent } = c.req.valid("json");

    // Get conversation with caregiver info
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    }

    // Get caregiver info
    const [caregiver] = await db
      .select()
      .from(caregivers)
      .where(eq(caregivers.id, conversation.caregiverId));

    // Get child info if set
    let child = null;
    if (conversation.childId) {
      const [childResult] = await db
        .select()
        .from(children)
        .where(eq(children.id, conversation.childId));
      child = childResult;
    }

    // Get existing messages
    const existingMessages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.createdAt);

    // Save user message
    const [userMessage] = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        role: "user",
        content: userContent,
      })
      .returning();

    // Update conversation title if this is the first message
    if (existingMessages.length === 0) {
      const title = generateConversationTitle(userContent);
      await db
        .update(conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }

    // Check if Claude is configured
    if (!env.ANTHROPIC_API_KEY) {
      // Return a mock response for development without API key
      const mockResponse = "I'm Flynn, your AAC assistant. However, the AI service is not configured. Please set the ANTHROPIC_API_KEY environment variable.";
      
      await db.insert(conversationMessages).values({
        conversationId,
        role: "assistant",
        content: mockResponse,
      });

      return c.json({
        data: {
          userMessage,
          assistantMessage: {
            role: "assistant",
            content: mockResponse,
          },
          usage: { inputTokens: 0, outputTokens: 0 },
        },
      });
    }

    // Build system prompt with context
    const promptOptions: Parameters<typeof buildFullContextPrompt>[0] = {};
    if (caregiver) promptOptions.caregiver = caregiver;
    if (child) promptOptions.child = child;
    const systemPrompt = buildFullContextPrompt(promptOptions);

    // Convert existing messages to Claude format
    const claudeMessages = dbMessagesToClaudeMessages(existingMessages);
    claudeMessages.push({ role: "user", content: userContent });

    // Set up tool executor (empty for now, tools will be registered separately)
    const toolExecutor = new ToolExecutor();
    const toolDefs = toolExecutor.getToolDefinitions();

    // Stream response
    return streamSSE(c, async (stream) => {
      try {
        const claudeService = new ClaudeService();
        let fullText = "";
        const toolCalls: ToolUseContent[] = [];
        let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

        // If no tools, use simple streaming
        if (toolDefs.length === 0) {
          const generator = claudeService.streamChat({
            messages: claudeMessages,
            system: systemPrompt,
            model: "sonnet",
          });

          let done = false;
          while (!done) {
            const result = await generator.next();
            if (result.done) {
              usage = result.value.usage;
              done = true;
            } else if (result.value.type === "text") {
              fullText += result.value.text;
              await stream.writeSSE({
                event: "text",
                data: JSON.stringify({ content: result.value.text }),
              });
            }
          }
        } else {
          // Use tool loop for multi-turn conversations
          const toolContext: import("../../../types/claude").ToolContext = {
            userId: conversation.caregiverId,
            conversationId,
          };
          if (conversation.childId) toolContext.childId = conversation.childId;
          if (caregiver?.familyId) toolContext.familyId = caregiver.familyId;

          const loopResult = await claudeService.executeToolLoop({
            messages: claudeMessages,
            system: systemPrompt,
            model: "sonnet",
            tools: toolDefs,
            executeToolCall: toolExecutor.createExecutor(toolContext),
            onText: async (text) => {
              fullText += text;
              await stream.writeSSE({
                event: "text",
                data: JSON.stringify({ content: text }),
              });
            },
            onToolCall: async (toolUse) => {
              toolCalls.push(toolUse);
              await stream.writeSSE({
                event: "tool_call",
                data: JSON.stringify({
                  id: toolUse.id,
                  name: toolUse.name,
                  input: toolUse.input,
                }),
              });

              // Save tool call to database
              await db.insert(conversationMessages).values({
                conversationId,
                role: "tool_call",
                content: JSON.stringify({ id: toolUse.id, input: toolUse.input }),
                toolName: toolUse.name,
                toolCallId: toolUse.id,
              });
            },
            onToolResult: async (toolUseId, result, isError) => {
              await stream.writeSSE({
                event: "tool_result",
                data: JSON.stringify({
                  id: toolUseId,
                  name: toolCalls.find(t => t.id === toolUseId)?.name ?? "unknown",
                  result,
                  isError,
                }),
              });

              // Save tool result to database
              await db.insert(conversationMessages).values({
                conversationId,
                role: "tool_result",
                content: typeof result === "string" ? result : JSON.stringify(result),
                toolCallId: toolUseId,
              });
            },
          });

          usage = loopResult.totalUsage;
        }

        // Save assistant message
        if (fullText) {
          await db.insert(conversationMessages).values({
            conversationId,
            role: "assistant",
            content: fullText,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          });
        }

        // Update conversation timestamp
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));

        // Send done event
        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({
            usage: {
              input: usage.inputTokens,
              output: usage.outputTokens,
            },
            stopReason: "end_turn",
          }),
        });
      } catch (error) {
        console.error("Streaming error:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({
            message: errorMessage,
            code: "STREAM_ERROR",
            retryable: false,
          }),
        });
      }
    });
  }
);

/**
 * Delete a conversation
 */
conversationsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  await db.delete(conversations).where(eq(conversations.id, id));

  return c.json({ message: "Conversation deleted" });
});

/**
 * Get messages for a conversation (paginated)
 */
conversationsRoutes.get("/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  const limit = Number(c.req.query("limit") ?? "50");
  const offset = Number(c.req.query("offset") ?? "0");

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) {
    throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  }

  const messages = await db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.createdAt)
    .limit(limit)
    .offset(offset);

  return c.json({ data: messages });
});
