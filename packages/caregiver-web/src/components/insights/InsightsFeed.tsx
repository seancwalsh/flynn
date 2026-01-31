/**
 * InsightsFeed Component
 *
 * Displays AI-generated insights with:
 * - Bell icon with unread badge
 * - Expandable insight cards
 * - Mark as read on view
 * - Dismiss action
 *
 * FLY-98: Insights table and in-app feed
 */

import * as React from "react";
import {
  Bell,
  AlertTriangle,
  Info,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  X,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@flynn-aac/shared-ui";
import { Button } from "@flynn-aac/shared-ui";
import { ScrollArea } from "@flynn-aac/shared-ui";
import { cn } from "~/lib/utils";
import { useInsights, type Insight } from "./useInsights";

// =============================================================================
// TYPES
// =============================================================================

interface InsightsFeedProps {
  childId: string;
  className?: string;
}

interface InsightCardProps {
  insight: Insight;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSeverityIcon(severity?: string | null): React.ReactNode {
  const iconClass = "h-4 w-4";
  switch (severity) {
    case "critical":
      return <AlertCircle className={cn(iconClass, "text-red-500")} />;
    case "warning":
      return <AlertTriangle className={cn(iconClass, "text-amber-500")} />;
    case "info":
    default:
      return <Info className={cn(iconClass, "text-blue-500")} />;
  }
}

function getTypeIcon(type: string): React.ReactNode {
  const iconClass = "h-4 w-4";
  switch (type) {
    case "regression_alert":
    case "anomaly":
      return <TrendingDown className={cn(iconClass, "text-red-500")} />;
    case "milestone":
      return <TrendingUp className={cn(iconClass, "text-green-500")} />;
    default:
      return null;
  }
}

function formatInsightType(type: string): string {
  const typeLabels: Record<string, string> = {
    daily_digest: "Daily Digest",
    weekly_report: "Weekly Report",
    regression_alert: "Regression Alert",
    milestone: "Milestone",
    suggestion: "Suggestion",
    anomaly: "Anomaly Detected",
  };
  return typeLabels[type] || type.replace(/_/g, " ");
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// INSIGHT CARD COMPONENT
// =============================================================================

function InsightCard({
  insight,
  onMarkRead,
  onDismiss,
  isExpanded,
  onToggleExpand,
}: InsightCardProps) {
  const isUnread = !insight.readAt;
  const severityStyles = {
    critical: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
    warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
    info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
  };

  const severityClass = insight.severity
    ? severityStyles[insight.severity as keyof typeof severityStyles]
    : "border-l-gray-300 bg-gray-50 dark:bg-gray-800/50";

  // Mark as read when expanded
  React.useEffect(() => {
    if (isExpanded && isUnread) {
      onMarkRead(insight.id);
    }
  }, [isExpanded, isUnread, insight.id, onMarkRead]);

  return (
    <div
      className={cn(
        "border-l-4 rounded-r-lg p-3 mb-2 transition-all",
        severityClass,
        isUnread && "ring-1 ring-primary/20"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getSeverityIcon(insight.severity)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {formatInsightType(insight.type)}
              </span>
              {isUnread && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <h4 className="font-medium text-sm truncate">
              {insight.title || "Insight"}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(new Date(insight.generatedAt))}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(insight.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Preview / Body */}
      <div
        className="mt-2 cursor-pointer"
        onClick={onToggleExpand}
      >
        {insight.body && (
          <p
            className={cn(
              "text-sm text-muted-foreground",
              !isExpanded && "line-clamp-2"
            )}
          >
            {insight.body}
          </p>
        )}

        {/* Expand/Collapse */}
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> More
            </>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && insight.content && (
          <div className="mt-3 p-2 bg-background/50 rounded text-xs font-mono overflow-auto max-h-40">
            <pre>{JSON.stringify(insight.content, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InsightsFeed({ childId, className }: InsightsFeedProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const { insights, unreadCount, isLoading, markAsRead, dismiss, refresh } =
    useInsights(childId);

  const handleMarkRead = React.useCallback(
    (id: string) => {
      markAsRead(id);
    },
    [markAsRead]
  );

  const handleDismiss = React.useCallback(
    (id: string) => {
      dismiss(id);
      if (expandedId === id) {
        setExpandedId(null);
      }
    },
    [dismiss, expandedId]
  );

  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Insights</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {unreadCount} unread
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={refresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[400px]">
          <div className="p-3">
            {isLoading && insights.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Check className="h-8 w-8 mb-2" />
                <p className="text-sm">All caught up!</p>
                <p className="text-xs">No new insights</p>
              </div>
            ) : (
              insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                  isExpanded={expandedId === insight.id}
                  onToggleExpand={() => handleToggleExpand(insight.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default InsightsFeed;
