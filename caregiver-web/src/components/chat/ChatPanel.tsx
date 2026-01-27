/**
 * ChatPanel Component
 *
 * Main chat container that can be used as:
 * - Full page chat
 * - Slide-over panel
 * - Embedded component
 *
 * Features:
 * - Responsive design (full screen mobile, slide-over tablet, side panel desktop)
 * - Conversation sidebar
 * - Message list with streaming
 * - Input with keyboard shortcuts
 */

import * as React from "react";
import { useEffect, useCallback } from "react";
import { X, Menu, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ConversationList } from "./ConversationList";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { useChat } from "./useChat";

// =============================================================================
// ERROR BANNER
// =============================================================================

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-2 bg-red-50 px-4 py-2 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="rounded p-1 hover:bg-red-100"
        aria-label="Dismiss error"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// =============================================================================
// CHAT PANEL
// =============================================================================

export type ChatPanelMode = "full" | "slide-over" | "embedded";

export interface ChatPanelProps {
  /** ID of the child to chat about */
  childId: string;
  /** Display mode */
  mode?: ChatPanelMode;
  /** Whether the panel is open (for slide-over mode) */
  isOpen?: boolean;
  /** Called when the panel should close (for slide-over mode) */
  onClose?: () => void;
  /** Class name for the container */
  className?: string;
}

export function ChatPanel({
  childId,
  mode = "full",
  isOpen = true,
  onClose,
  className,
}: ChatPanelProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    error,
    activeToolCalls,
    loadConversations,
    selectConversation,
    createNewConversation,
    deleteConversation,
    sendMessage,
    stopStreaming,
    clearError,
  } = useChat({ childId });

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Close sidebar on mobile when conversation is selected
  const handleSelectConversation = useCallback(
    (id: string) => {
      selectConversation(id);
      setSidebarOpen(false);
    },
    [selectConversation]
  );

  // Create new conversation
  const handleNewConversation = useCallback(async () => {
    await createNewConversation({ childId });
    setSidebarOpen(false);
  }, [childId, createNewConversation]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close slide-over
      if (e.key === "Escape" && mode === "slide-over" && onClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mode, onClose]);

  // Don't render if slide-over is closed
  if (mode === "slide-over" && !isOpen) {
    return null;
  }

  const content = (
    <div
      className={cn(
        "flex h-full bg-white",
        mode === "slide-over" && "shadow-xl",
        className
      )}
    >
      {/* Sidebar - Desktop */}
      <div
        className={cn(
          "hidden flex-shrink-0 border-r md:block",
          mode === "full" ? "w-80" : "w-72"
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedId={currentConversation?.id}
          isLoading={isLoading && !currentConversation}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={deleteConversation}
        />
      </div>

      {/* Sidebar - Mobile (overlay) */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl md:hidden">
            <ConversationList
              conversations={conversations}
              selectedId={currentConversation?.id}
              isLoading={isLoading && !currentConversation}
              onSelect={handleSelectConversation}
              onNew={handleNewConversation}
              onDelete={deleteConversation}
            />
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden"
            aria-label="Open conversations"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Title */}
          <h1 className="flex-1 truncate text-lg font-semibold text-gray-900">
            {currentConversation?.title || "Chat"}
          </h1>

          {/* Close button for slide-over */}
          {mode === "slide-over" && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Error banner */}
        {error && <ErrorBanner message={error} onDismiss={clearError} />}

        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading && !!currentConversation}
          toolCallStatus={activeToolCalls}
          className="flex-1"
        />

        {/* Input */}
        {currentConversation && (
          <ChatInput
            onSend={sendMessage}
            onStop={stopStreaming}
            isStreaming={isStreaming}
            disabled={isLoading}
            placeholder="Ask me anything about your child's communication..."
          />
        )}

        {/* No conversation selected state */}
        {!currentConversation && !isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="mb-4 text-gray-500">
              Select a conversation or start a new one
            </p>
            <Button onClick={handleNewConversation}>Start New Conversation</Button>
          </div>
        )}
      </div>
    </div>
  );

  // Wrap in slide-over container if needed
  if (mode === "slide-over") {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          className={cn(
            "relative w-full max-w-2xl transform transition-transform",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Chat panel"
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export default ChatPanel;
