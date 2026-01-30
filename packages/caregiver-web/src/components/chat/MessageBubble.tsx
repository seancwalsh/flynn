/**
 * MessageBubble Component
 *
 * Renders individual chat messages with support for:
 * - User messages (right-aligned, primary color)
 * - Assistant messages (left-aligned, gray)
 * - Tool calls (collapsible)
 * - Streaming indicator
 */

import * as React from "react";
import { ChevronDown, ChevronRight, Loader2, Search, Database, FileText, Wrench } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { cn, formatMessageTime } from "~/lib/utils";
import type { Message, ToolCall, ToolResult } from "./types";

// =============================================================================
// TOOL CALL COMPONENTS
// =============================================================================

interface ToolCallDisplayProps {
  toolCall: ToolCall;
  result?: ToolResult;
  isLoading?: boolean;
}

/**
 * Get icon for tool name
 */
function getToolIcon(name: string): React.ReactNode {
  const iconClass = "h-4 w-4";
  switch (name.toLowerCase()) {
    case "search":
    case "web_search":
      return <Search className={iconClass} />;
    case "database":
    case "query":
    case "lookup":
      return <Database className={iconClass} />;
    case "read_file":
    case "document":
      return <FileText className={iconClass} />;
    default:
      return <Wrench className={iconClass} />;
  }
}

/**
 * Format tool name for display
 */
function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Display a single tool call with optional result
 */
function ToolCallDisplay({ toolCall, result, isLoading }: ToolCallDisplayProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            "bg-gray-50 hover:bg-gray-100",
            isLoading && "animate-pulse-subtle"
          )}
          aria-expanded={isOpen}
          aria-label={`Tool call: ${formatToolName(toolCall.name)}`}
        >
          <span className="text-gray-500">{getToolIcon(toolCall.name)}</span>
          <span className="flex-1 font-medium text-gray-700">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 inline h-3 w-3 animate-spin" />
                Looking up {formatToolName(toolCall.name)}...
              </>
            ) : (
              formatToolName(toolCall.name)
            )}
          </span>
          {!isLoading && (
            <span className="text-gray-400">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 px-3">
        <div className="space-y-2 text-xs">
          {/* Arguments */}
          <div>
            <span className="font-medium text-gray-500">Arguments:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-gray-100 p-2 text-gray-700">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {result && (
            <div>
              <span className={cn("font-medium", result.isError ? "text-red-500" : "text-gray-500")}>
                {result.isError ? "Error:" : "Result:"}
              </span>
              <pre
                className={cn(
                  "mt-1 max-h-40 overflow-auto rounded p-2 text-gray-700",
                  result.isError ? "bg-red-50" : "bg-gray-100"
                )}
              >
                {typeof result.content === "string"
                  ? result.content
                  : JSON.stringify(result.content, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// STREAMING INDICATOR
// =============================================================================

function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Typing">
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
    </span>
  );
}

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

export interface MessageBubbleProps {
  message: Message;
  /** Map of tool call IDs to their loading status */
  toolCallStatus?: Map<string, { name: string; status: "pending" | "complete" }>;
  /** Whether to show the timestamp */
  showTimestamp?: boolean;
  /** Class name for the outer container */
  className?: string;
}

export function MessageBubble({
  message,
  toolCallStatus,
  showTimestamp = true,
  className,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";
  const isTool = message.role === "tool";

  // Don't render tool messages directly - they're displayed as part of assistant messages
  if (isTool) return null;

  // Find tool results that match tool calls
  const getToolResult = (toolCallId: string): ToolResult | undefined => {
    return message.toolResults?.find((r) => r.toolCallId === toolCallId);
  };

  return (
    <div
      className={cn(
        "flex w-full animate-fade-in",
        isUser ? "justify-end" : "justify-start",
        className
      )}
      role="article"
      aria-label={`${message.role} message`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl px-4 py-3",
          isUser && "bg-primary-600 text-white",
          isAssistant && "bg-gray-100 text-gray-900",
          isSystem && "bg-amber-50 text-amber-900 border border-amber-200",
          message.isPending && "opacity-70"
        )}
      >
        {/* System message label */}
        {isSystem && (
          <div className="text-xs font-medium text-amber-700">System</div>
        )}

        {/* Tool calls (for assistant messages) */}
        {isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((toolCall) => {
              const status = toolCallStatus?.get(toolCall.id);
              return (
                <ToolCallDisplay
                  key={toolCall.id}
                  toolCall={toolCall}
                  result={getToolResult(toolCall.id)}
                  isLoading={status?.status === "pending"}
                />
              );
            })}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && !message.content && <StreamingIndicator />}
        {message.isStreaming && message.content && (
          <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-gray-400" aria-hidden />
        )}

        {/* Timestamp */}
        {showTimestamp && !message.isStreaming && (
          <div
            className={cn(
              "text-[10px]",
              isUser ? "text-primary-200" : "text-gray-400"
            )}
          >
            {formatMessageTime(message.createdAt)}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
