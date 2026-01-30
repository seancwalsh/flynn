/**
 * MessageList Component
 *
 * Scrollable container for chat messages with:
 * - Auto-scroll to bottom on new messages
 * - Scroll-to-bottom button when scrolled up
 * - Empty state
 * - Loading state
 */

import * as React from "react";
import { useEffect, useRef, useCallback } from "react";
import { ArrowDown, MessageSquare, Loader2 } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "./types";

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <MessageSquare className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900">No messages yet</h3>
      <p className="max-w-sm text-sm text-gray-500">
        Start a conversation by typing a message below. I'm here to help you
        with questions about your child's AAC journey.
      </p>
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

// =============================================================================
// MESSAGE LIST
// =============================================================================

export interface MessageListProps {
  /** Messages to display */
  messages: Message[];
  /** Whether the conversation is loading */
  isLoading?: boolean;
  /** Active tool calls with their status */
  toolCallStatus?: Map<string, { name: string; status: "pending" | "complete" }>;
  /** Class name for the container */
  className?: string;
}

export function MessageList({
  messages,
  isLoading = false,
  toolCallStatus,
  className,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [isNearBottom, setIsNearBottom] = React.useState(true);

  // Check if scrolled near bottom
  const checkScrollPosition = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;

    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom && messages.length > 0);
  }, [messages.length]);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Auto-scroll on new messages (only if near bottom)
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom("instant");
  }, [scrollToBottom]);

  // Set up scroll listener
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;

    viewport.addEventListener("scroll", checkScrollPosition, { passive: true });
    return () => viewport.removeEventListener("scroll", checkScrollPosition);
  }, [checkScrollPosition]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className={cn("relative flex-1", className)}>
      <ScrollArea ref={scrollAreaRef} className="h-full">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3 p-4" role="log" aria-live="polite">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                toolCallStatus={toolCallStatus}
                showTimestamp={
                  // Show timestamp if it's the last message or if there's a time gap
                  index === messages.length - 1 ||
                  shouldShowTimestamp(message, messages[index + 1])
                }
              />
            ))}
            <div ref={bottomRef} aria-hidden="true" />
          </div>
        )}
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => scrollToBottom("smooth")}
            className="shadow-lg"
            aria-label="Scroll to latest messages"
          >
            <ArrowDown className="mr-1 h-4 w-4" />
            New messages
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Determine if we should show a timestamp between two messages
 */
function shouldShowTimestamp(current: Message, next?: Message): boolean {
  if (!next) return true;

  const currentTime = new Date(current.createdAt).getTime();
  const nextTime = new Date(next.createdAt).getTime();

  // Show timestamp if there's more than 5 minutes between messages
  const fiveMinutes = 5 * 60 * 1000;
  return nextTime - currentTime > fiveMinutes;
}

export default MessageList;
