/**
 * Dashboard Page
 * FLY-139: Caregiver Dashboard - Smart Overview
 *
 * Default view for caregivers with dashboard-first design
 * that transforms into chat when user asks questions.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardView } from "~/components/dashboard";
import { useDashboard } from "~/components/dashboard/useDashboard";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const {
    children,
    selectedChild,
    todayStats,
    insights,
    isLoadingChildren,
    isLoadingStats,
    isLoadingInsights,
    selectChild,
  } = useDashboard();

  // Handle adding a new session
  const handleAddSession = () => {
    // TODO: Open session logging modal or navigate to session page
    console.log("Add session for child:", selectedChild?.id);
  };

  // Show loading state while children are loading
  if (isLoadingChildren) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Show empty state if no children
  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center px-4">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No children added yet</h2>
        <p className="text-gray-600 mb-6 max-w-sm">
          Add your first child to start tracking their communication progress and get personalized
          insights.
        </p>
        <button
          onClick={() => navigate({ to: "/children" })}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          Add Your First Child
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)]">
      <DashboardView
        children={children}
        selectedChild={selectedChild}
        onSelectChild={selectChild}
        todayStats={todayStats}
        insights={insights}
        isLoadingStats={isLoadingStats}
        isLoadingInsights={isLoadingInsights}
        onAddSession={handleAddSession}
        className="h-full"
      />
    </div>
  );
}
