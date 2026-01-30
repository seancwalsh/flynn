/**
 * ChatInput Component
 *
 * Textarea with send button for chat messages:
 * - Auto-resize textarea
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Disabled state during streaming
 * - Stop button when streaming
 */

import * as React from "react";
import { useRef, useCallback, useEffect } from "react";
import { Send, Square, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface ChatInputProps {
  /** Called when a message is submitted */
  onSend: (content: string) => void;
  /** Called when the stop button is clicked */
  onStop?: () => void;
  /** Whether the chat is currently streaming */
  isStreaming?: boolean;
  /** Whether the input should be disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Class name for the container */
  className?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight, with a max of 200px
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Adjust height when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;

    onSend(trimmed);
    setValue("");

    // Focus back on textarea after sending
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [value, disabled, isStreaming, onSend]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift sends the message
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const canSend = value.trim().length > 0 && !disabled && !isStreaming;

  return (
    <div className={cn("border-t bg-white p-4", className)}>
      <div className="mx-auto flex max-w-4xl items-end gap-2">
        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 pr-12 text-sm",
              "placeholder:text-gray-400",
              "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
              "disabled:cursor-not-allowed disabled:bg-gray-50",
              "transition-colors"
            )}
            aria-label="Message input"
          />

          {/* Character hint for long messages */}
          {value.length > 500 && (
            <div className="absolute bottom-1 right-12 text-[10px] text-gray-400">
              {value.length}
            </div>
          )}
        </div>

        {/* Send / Stop button */}
        {isStreaming ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="h-12 w-12 shrink-0 rounded-full"
            aria-label="Stop generating"
          >
            <Square className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={handleSubmit}
            disabled={!canSend}
            className="h-12 w-12 shrink-0 rounded-full"
            aria-label="Send message"
          >
            {disabled && !isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="mx-auto mt-2 flex max-w-4xl justify-center">
        <p className="text-xs text-gray-400">
          Press <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono">Enter</kbd> to send,{" "}
          <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}

export default ChatInput;
