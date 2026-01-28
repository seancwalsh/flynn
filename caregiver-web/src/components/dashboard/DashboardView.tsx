/**
 * DashboardView Component
 * FLY-139: Caregiver Dashboard - Smart Overview
 * FLY-143: Dashboard → Chat Transition
 *
 * Main container that transforms from dashboard to chat mode:
 * - Dashboard mode (default): Shows widgets + chat input
 * - Chat mode: Dashboard compresses, chat expands
 * - Smooth animation between modes
 */

import * as React from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { ChildSelector } from "./ChildSelector";
import { TodayWidget } from "./TodayWidget";
import { InsightsWidget } from "./InsightsWidget";
import { ChatInput, type ChatInputHandle } from "~/components/chat/ChatInput";
import { MessageList } from "~/components/chat/MessageList";
import { useChat } from "~/components/chat/useChat";
import type { DashboardChild, DashboardMode, TodayStats } from "./types";

interface DashboardViewProps {
  children: DashboardChild[];
  selectedChild: DashboardChild | null;
  onSelectChild: (child: DashboardChild) => void;
  todayStats: TodayStats | null;
  insights: Array<{
    id: string;
    type: "trend_up" | "trend_down" | "alert" | "milestone" | "suggestion";
    title: string;
    description: string;
    timestamp: Date;
  }>;
  isLoadingStats?: boolean;
  isLoadingInsights?: boolean;
  onAddSession: () => void;
  className?: string;
}

export function DashboardView({
  children,
  selectedChild,
  onSelectChild,
  todayStats,
  insights,
  isLoadingStats,
  isLoadingInsights,
  onAddSession,
  className,
}: DashboardViewProps) {
  const [mode, setMode] = React.useState<DashboardMode>("dashboard");
  const chatInputRef = React.useRef<ChatInputHandle>(null);

  const {
    messages,
    isLoading: isChatLoading,
    isStreaming,
    error: chatError,
    activeToolCalls,
    sendMessage,
    stopStreaming,
    clearError,
  } = useChat({ childId: selectedChild?.id || "" });

  // Handle sending a message (switches to chat mode)
  const handleSendMessage = React.useCallback(
    async (content: string) => {
      if (!selectedChild) return;
      setMode("chat");
      await sendMessage(content);
    },
    [selectedChild, sendMessage]
  );

  // Handle asking about an insight
  const handleAskAboutInsight = React.useCallback(
    (insight: { title: string; description: string }) => {
      const question = `Tell me more about: ${insight.title}`;
      handleSendMessage(question);
    },
    [handleSendMessage]
  );

  // Handle going back to dashboard
  const handleBackToDashboard = React.useCallback(() => {
    setMode("dashboard");
  }, []);

  // Focus chat input when clicking the input area in dashboard mode
  const handleInputAreaClick = React.useCallback(() => {
    chatInputRef.current?.focus();
  }, []);

  const isDashboard = mode === "dashboard";
  const isChat = mode === "chat";
  const hasMessages = messages.length > 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header - always visible */}
      <div className="flex-shrink-0 pb-4">
        {isChat && hasMessages ? (
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to dashboard</span>
          </button>
        ) : null}

        <ChildSelector
          children={children}
          selectedChild={selectedChild}
          onSelectChild={onSelectChild}
          onAddSession={onAddSession}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Dashboard Widgets - collapse in chat mode */}
        <div
          className={cn(
            "transition-all duration-300 ease-out overflow-hidden",
            isDashboard ? "flex-shrink-0" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-4 pb-4">
            {/* Today Widget */}
            <TodayWidget
              stats={todayStats}
              isLoading={isLoadingStats}
            />

            {/* Insights Widget */}
            <InsightsWidget
              childId={selectedChild?.id || ""}
              insights={insights}
              isLoading={isLoadingInsights}
              onAskAbout={handleAskAboutInsight}
            />
          </div>
        </div>

        {/* Chat Area - expands in chat mode */}
        <div
          className={cn(
            "transition-all duration-300 ease-out",
            isChat ? "flex-1 min-h-0" : "flex-shrink-0"
          )}
        >
          {/* Message List - only show in chat mode with messages */}
          {isChat && hasMessages && (
            <div className="h-full overflow-y-auto pb-4">
              <MessageList
                messages={messages}
                isLoading={isChatLoading}
                toolCallStatus={activeToolCalls}
              />
            </div>
          )}
        </div>
      </div>

      {/* Chat Input - always at bottom */}
      <div
        className={cn(
          "flex-shrink-0 pt-2 border-t border-gray-100",
          isDashboard && "cursor-text"
        )}
        onClick={isDashboard ? handleInputAreaClick : undefined}
      >
        {chatError && (
          <div className="mb-2 p-2 bg-red-50 text-red-700 text-sm rounded-lg flex items-center justify-between">
            <span>{chatError}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 text-xs font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="relative">
          {/* Placeholder text when in dashboard mode */}
          {isDashboard && !hasMessages && (
            <div className="absolute inset-0 flex items-center pointer-events-none px-4">
              <MessageCircle className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-gray-500">
                Ask anything about {selectedChild?.name || "your child"}...
              </span>
            </div>
          )}

          <ChatInput
            ref={chatInputRef}
            onSend={handleSendMessage}
            isLoading={isChatLoading}
            isStreaming={isStreaming}
            onStopStreaming={stopStreaming}
            disabled={!selectedChild}
            placeholder=""
            className={cn(
              isDashboard && !hasMessages && "opacity-0 focus-within:opacity-100",
              "transition-opacity"
            )}
          />
        </div>
      </div>
    </div>
  );
}
