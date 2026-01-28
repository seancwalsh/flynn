/**
 * InsightsWidget Component
 * FLY-142: Insights Widget
 *
 * Widget displaying pre-computed LLM insights:
 * - Weekly trend comparison
 * - Notable patterns
 * - Potential concerns (regression alerts)
 */

import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";

interface Insight {
  id: string;
  type: "trend_up" | "trend_down" | "alert" | "milestone" | "suggestion";
  title: string;
  description: string;
  timestamp: Date;
}

interface InsightsWidgetProps {
  childId: string;
  insights: Insight[];
  isLoading?: boolean;
  onViewAll?: () => void;
  onAskAbout?: (insight: Insight) => void;
  className?: string;
}

function getInsightIcon(type: Insight["type"]) {
  switch (type) {
    case "trend_up":
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    case "trend_down":
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    case "alert":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "milestone":
      return <Sparkles className="w-4 h-4 text-purple-600" />;
    case "suggestion":
    default:
      return <Lightbulb className="w-4 h-4 text-blue-600" />;
  }
}

function getInsightBgColor(type: Insight["type"]) {
  switch (type) {
    case "trend_up":
      return "bg-green-50";
    case "trend_down":
      return "bg-red-50";
    case "alert":
      return "bg-amber-50";
    case "milestone":
      return "bg-purple-50";
    case "suggestion":
    default:
      return "bg-blue-50";
  }
}

function InsightCard({
  insight,
  onAskAbout,
}: {
  insight: Insight;
  onAskAbout?: (insight: Insight) => void;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl transition-colors",
        getInsightBgColor(insight.type)
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{insight.title}</p>
          <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">
            {insight.description}
          </p>
          {onAskAbout && (
            <button
              onClick={() => onAskAbout(insight)}
              className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Ask about this
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="p-3 bg-gray-100 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 bg-gray-200 rounded mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InsightsWidget({
  insights,
  isLoading,
  onViewAll,
  onAskAbout,
  className,
}: InsightsWidgetProps) {
  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 shadow-sm border border-gray-100", className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const displayInsights = insights.slice(0, 3);
  const hasMore = insights.length > 3;

  return (
    <div className={cn("bg-white rounded-2xl p-5 shadow-sm border border-gray-100", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Insights</h3>
        </div>
        {hasMore && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {displayInsights.length > 0 ? (
        <div className="space-y-3">
          {displayInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAskAbout={onAskAbout}
            />
          ))}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No insights yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Insights will appear as we analyze activity
          </p>
        </div>
      )}
    </div>
  );
}
