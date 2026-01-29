import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { childrenApi, type ChildWithProgress } from "~/lib/api";

export const Route = createFileRoute("/_app/children/$childId")({
  component: ChildDetailPage,
});

function ChildDetailPage() {
  const params = useParams({ strict: false });
  const childId = params.childId as string;
  const [child, setChild] = useState<ChildWithProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadChild();
  }, [childId]);

  const loadChild = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await childrenApi.get(childId);
      if (response.error) {
        throw new Error(response.error);
      }
      setChild(response.data?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load child");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="card bg-red-50 border-red-200">
        <div className="flex items-center space-x-3 text-red-700">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-semibold">Error loading child</h3>
            <p className="text-sm">{error || "Child not found"}</p>
          </div>
        </div>
        <Link to="/children" className="btn-primary mt-4">
          Back to Children
        </Link>
      </div>
    );
  }

  const age = child.birthDate
    ? Math.floor(
        (new Date().getTime() - new Date(child.birthDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/children"
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Children
        </Link>
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-600">
              {child.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
            {age !== null && (
              <p className="text-lg text-gray-600">{age} years old</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Symbols Learned</span>
            <svg
              className="w-5 h-5 text-primary-600"
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
          <p className="text-3xl font-bold text-gray-900">
            {child.symbolsLearned || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of {child.totalSymbols || 0} total
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Recent Activity</span>
            <svg
              className="w-5 h-5 text-primary-600"
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
          <p className="text-lg font-semibold text-gray-900">
            {child.recentActivity || "No recent activity"}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Member Since</span>
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {new Date(child.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/dashboard" className="btn-primary text-center">
            View Progress Dashboard
          </Link>
          <button className="btn-secondary" disabled>
            Start Chat Session
          </button>
          <button className="btn-secondary" disabled>
            View Usage History
          </button>
          <button className="btn-secondary" disabled>
            Customize Symbol Board
          </button>
        </div>
      </div>
    </div>
  );
}
