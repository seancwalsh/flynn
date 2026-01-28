/**
 * Chat Components
 *
 * A complete chat UI system with SSE streaming support.
 *
 * @example
 * ```tsx
 * import { ChatPanel } from '~/components/chat';
 *
 * function ChatPage() {
 *   return <ChatPanel childId="child-uuid" mode="full" />;
 * }
 * ```
 */

// Main components
export { ChatPanel, type ChatPanelProps, type ChatPanelMode } from "./ChatPanel";
export { MessageList, type MessageListProps } from "./MessageList";
export { MessageBubble, type MessageBubbleProps } from "./MessageBubble";
export { ChatInput, type ChatInputProps, type ChatInputHandle } from "./ChatInput";
export { ConversationList, type ConversationListProps } from "./ConversationList";

// Hook
export { useChat, type UseChatOptions, type UseChatReturn } from "./useChat";

// Types
export type {
  Message,
  MessageRole,
  Conversation,
  ConversationWithMessages,
  ToolCall,
  ToolResult,
  TokenUsage,
  SSEEvent,
  SSEEventType,
} from "./types";
