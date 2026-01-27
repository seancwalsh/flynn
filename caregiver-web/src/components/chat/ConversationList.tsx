/**
 * ConversationList Component
 *
 * Sidebar showing past conversations:
 * - New conversation button
 * - List of conversations
 * - Selected state
 * - Empty state
 */

import * as React from "react";
import { Plus, MessageSquare, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { cn, formatMessageTime } from "~/lib/utils";
import type { Conversation } from "./types";

// =============================================================================
// CONVERSATION ITEM
// =============================================================================

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete?.(conversation.id);
  };

  return (
    <div className="group relative" ref={menuRef}>
      <button
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg px-3 py-2 pr-10 text-left transition-colors",
          isSelected
            ? "bg-primary-50 text-primary-900"
            : "hover:bg-gray-100 text-gray-700"
        )}
        aria-selected={isSelected}
        role="option"
      >
        <MessageSquare
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            isSelected ? "text-primary-600" : "text-gray-400"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {conversation.title || "New conversation"}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{conversation.messageCount} messages</span>
            <span>•</span>
            <span>{formatMessageTime(conversation.updatedAt)}</span>
          </div>
        </div>
      </button>

      {/* Menu button - positioned absolutely to avoid button nesting */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={cn(
            "absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-gray-200",
            "group-hover:opacity-100",
            showMenu && "opacity-100 bg-gray-200"
          )}
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute right-2 top-10 z-10 w-40 rounded-lg border bg-white py-1 shadow-lg">
          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <MessageSquare className="mb-3 h-8 w-8 text-gray-300" />
      <p className="text-sm text-gray-500">No conversations yet</p>
      <p className="mt-1 text-xs text-gray-400">
        Start a new conversation to begin
      </p>
    </div>
  );
}

// =============================================================================
// CONVERSATION LIST
// =============================================================================

export interface ConversationListProps {
  /** List of conversations */
  conversations: Conversation[];
  /** ID of the currently selected conversation */
  selectedId?: string;
  /** Whether conversations are loading */
  isLoading?: boolean;
  /** Called when a conversation is selected */
  onSelect: (id: string) => void;
  /** Called when the new conversation button is clicked */
  onNew: () => void;
  /** Called when a conversation is deleted */
  onDelete?: (id: string) => void;
  /** Class name for the container */
  className?: string;
}

export function ConversationList({
  conversations,
  selectedId,
  isLoading = false,
  onSelect,
  onNew,
  onDelete,
  className,
}: ConversationListProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
        <Button
          variant="default"
          size="sm"
          onClick={onNew}
          className="gap-1"
          aria-label="Start new conversation"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-1 p-2" role="listbox" aria-label="Conversations">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default ConversationList;
