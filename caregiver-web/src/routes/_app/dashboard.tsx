import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "~/lib/auth";
import { useState, useEffect } from "react";
import {
  childrenApi,
  usageStatsApi,
  type Child,
  type UsageStats,
} from "~/lib/api";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

interface DashboardStats {
  childrenCount: number;
  totalSymbolsLearned: number;
  totalSessions: number;
  avgDailyUse: string;
}

function DashboardPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    childrenCount: 0,
    totalSymbolsLearned: 0,
    totalSessions: 0,
    avgDailyUse: "--",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      // Get children
      const childrenResponse = await childrenApi.list();
      const childrenData = childrenResponse.data?.data || [];
      setChildren(childrenData);

      // Aggregate stats from all children
      let totalSymbols = 0;
      let totalLogs = 0;

      for (const child of childrenData) {
        const statsResponse = await usageStatsApi.getChildStats(child.id);
        if (statsResponse.data?.data) {
          const childStats = statsResponse.data.data;
          totalSymbols += childStats.uniqueSymbols;
          totalLogs += childStats.totalLogs;
        }
      }

      // Calculate sessions (rough estimate: logs grouped by day)
      // In a real app, you'd track actual sessions
      const sessionsThisWeek = Math.floor(totalLogs / 10); // Rough estimate

      // Calculate avg daily use
      const avgDailyUse =
        totalLogs > 0 ? `${Math.round(totalLogs / 7)} uses` : "--";

      setStats({
        childrenCount: childrenData.length,
        totalSymbolsLearned: totalSymbols,
        totalSessions: sessionsThisWeek,
        avgDailyUse,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChildren = children.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
        </h1>
        <p className="text-gray-600 mt-1">
          {hasChildren
            ? "Here's what's happening with your children's communication progress."
            : "Get started by adding a child's profile to track their progress."}
        </p>
      </div>

      {/* Quick Stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Link to="/children" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
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
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.childrenCount}
                </p>
                <p className="text-sm text-gray-500">Children</p>
              </div>
            </div>
          </Link>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalSymbolsLearned}
                </p>
                <p className="text-sm text-gray-500">Symbols Learned</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalSessions}
                </p>
                <p className="text-sm text-gray-500">Sessions This Week</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgDailyUse}
                </p>
                <p className="text-sm text-gray-500">Avg. Daily Use</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity / Getting Started */}
      <div className="grid gap-6 lg:grid-cols-2">
        {!hasChildren && !isLoading ? (
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Getting Started
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-primary-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Create your account</p>
                  <p className="text-sm text-gray-500">You're all set!</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-gray-400">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add your first child</p>
                  <p className="text-sm text-gray-500">
                    Set up a profile for your child to track their progress
                  </p>
                  <Link to="/children" className="btn-primary mt-2 inline-block">
                    Add Child
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-gray-400">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Download the iOS app
                  </p>
                  <p className="text-sm text-gray-500">
                    Get Flynn AAC on your child's iPad
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-gray-400">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Start communicating!
                  </p>
                  <p className="text-sm text-gray-500">
                    Begin using symbols and track progress here
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Children
              </h2>
              <div className="space-y-3">
                {children.slice(0, 3).map((child) => (
                  <Link
                    key={child.id}
                    to={`/children/${child.id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-600">
                        {child.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{child.name}</p>
                      <p className="text-xs text-gray-500">
                        Member since{" "}
                        {new Date(child.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ))}
                {children.length > 3 && (
                  <Link
                    to="/children"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium block text-center mt-2"
                  >
                    View all {children.length} children →
                  </Link>
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg
                  className="w-12 h-12 text-gray-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p className="text-gray-500">No activity yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Activity will appear here once your child starts using the app
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
