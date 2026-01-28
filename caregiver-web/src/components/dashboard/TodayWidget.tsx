/**
 * TodayWidget Component
 * FLY-141: Today's Activity Widget
 *
 * Widget showing today's session summary:
 * - Sessions logged count
 * - Words used count
 * - Communication attempts
 * - Brief LLM-generated observation (cached)
 */

import * as React from "react";
import { Activity, MessageSquare, Zap, Sparkles } from "lucide-react";
import { cn } from "~/lib/utils";
import type { TodayStats } from "./types";

interface TodayWidgetProps {
  stats: TodayStats | null;
  isLoading?: boolean;
  className?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

function StatItem({ icon, label, value, color }: StatItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="space-y-2">
          <div className="h-6 w-12 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="space-y-2">
          <div className="h-6 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TodayWidget({ stats, isLoading, className }: TodayWidgetProps) {
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

  const hasActivity = stats && (stats.sessionsLogged > 0 || stats.wordsUsed > 0);

  return (
    <div className={cn("bg-white rounded-2xl p-5 shadow-sm border border-gray-100", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Today</h3>
      </div>

      {hasActivity ? (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatItem
              icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
              label="sessions"
              value={stats.sessionsLogged}
              color="bg-blue-100"
            />
            <StatItem
              icon={<Zap className="w-5 h-5 text-purple-600" />}
              label="words used"
              value={stats.wordsUsed}
              color="bg-purple-100"
            />
          </div>

          {/* Communication attempts */}
          {stats.communicationAttempts > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Communication attempts</span>
                <span className="font-semibold text-gray-900">{stats.communicationAttempts}</span>
              </div>
            </div>
          )}

          {/* LLM Observation */}
          {stats.observation && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 italic">
                  "{stats.observation}"
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-gray-500 text-sm">No activity logged today</p>
          <p className="text-gray-400 text-xs mt-1">
            Sessions will appear here once recorded
          </p>
        </div>
      )}
    </div>
  );
}
