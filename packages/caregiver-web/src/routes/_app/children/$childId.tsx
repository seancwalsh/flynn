import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { childrenApi, goalsApi, type ChildWithProgress, type ChildStats, type Goal, type CreateGoalInput, type UpdateGoalInput, type TherapyType, type GoalStatus } from "~/lib/api";
import { Button } from "@flynn-aac/shared-ui";
import { BarChart3, MessageSquare, History, Grid3x3, Target, Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/children/$childId")({
  component: ChildDetailPage,
});

function ChildDetailPage() {
  const params = useParams({ strict: false });
  const childId = params.childId as string;
  const [child, setChild] = useState<ChildWithProgress | null>(null);
  const [stats, setStats] = useState<ChildStats | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    loadChild();
    loadStats();
    loadGoals();
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

  const loadStats = async () => {
    try {
      const response = await childrenApi.getStats(childId);
      if (!response.error && response.data) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const loadGoals = async () => {
    try {
      const response = await goalsApi.listForChild(childId);
      if (!response.error && response.data) {
        setGoals(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load goals:", err);
    }
  };

  const handleCreateGoal = async (input: CreateGoalInput) => {
    try {
      const response = await goalsApi.create(childId, input);
      if (response.error) {
        alert("Failed to create goal: " + response.error);
        return;
      }
      setShowGoalForm(false);
      loadGoals();
      loadStats();
    } catch (err) {
      alert("Failed to create goal");
    }
  };

  const handleUpdateGoal = async (goalId: string, input: UpdateGoalInput) => {
    try {
      const response = await goalsApi.update(goalId, input);
      if (response.error) {
        alert("Failed to update goal: " + response.error);
        return;
      }
      setEditingGoal(null);
      loadGoals();
      loadStats();
    } catch (err) {
      alert("Failed to update goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) {
      return;
    }
    try {
      const response = await goalsApi.delete(goalId);
      if (response.error) {
        alert("Failed to delete goal: " + response.error);
        return;
      }
      loadGoals();
      loadStats();
    } catch (err) {
      alert("Failed to delete goal");
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
        <Button asChild className="mt-4">
          <Link to="/children">Back to Children</Link>
        </Button>
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
            {stats?.totalSymbols || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            unique symbols used
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
            {stats?.recentActivity
              ? new Date(stats.recentActivity).toLocaleDateString()
              : "No recent activity"}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">AI Insights</span>
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.insightCount || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats?.goalCount || 0} active goals
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button asChild variant="default" className="justify-start">
            <Link to="/dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              View Progress Dashboard
            </Link>
          </Button>
          <Button variant="outline" disabled className="justify-start gap-2">
            <MessageSquare className="h-4 w-4" />
            Start Chat Session
          </Button>
          <Button variant="outline" disabled className="justify-start gap-2">
            <History className="h-4 w-4" />
            View Usage History
          </Button>
          <Button variant="outline" disabled className="justify-start gap-2">
            <Grid3x3 className="h-4 w-4" />
            Customize Symbol Board
          </Button>
        </div>
      </div>

      {/* Therapy Goals Section */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Therapy Goals</h2>
            <span className="text-sm text-gray-500">
              ({goals.filter(g => g.status === 'active').length} active)
            </span>
          </div>
          <Button onClick={() => setShowGoalForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Goal
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No goals yet</p>
            <p className="text-sm mt-1">Create your first therapy goal to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(g) => setEditingGoal(g)}
                onDelete={handleDeleteGoal}
                onUpdateProgress={(id, progress) => handleUpdateGoal(id, { progressPercent: progress })}
                onUpdateGoal={handleUpdateGoal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalFormModal
          childId={childId}
          onClose={() => setShowGoalForm(false)}
          onSubmit={handleCreateGoal}
        />
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <GoalFormModal
          childId={childId}
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={(input) => handleUpdateGoal(editingGoal.id, input)}
        />
      )}
    </div>
  );
}

// Goal Card Component
function GoalCard({
  goal,
  onEdit,
  onDelete,
  onUpdateProgress,
  onUpdateGoal,
}: {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onUpdateGoal: (id: string, input: UpdateGoalInput) => void;
}) {
  const therapyTypeLabels: Record<TherapyType, string> = {
    aac: "AAC",
    aba: "ABA",
    ot: "OT",
    slp: "SLP",
    pt: "PT",
    other: "Other",
  };

  const statusColors: Record<GoalStatus, string> = {
    active: "bg-blue-100 text-blue-700",
    achieved: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    discontinued: "bg-gray-100 text-gray-700",
  };

  const handleQuickProgress = (increment: number) => {
    const newProgress = Math.max(0, Math.min(100, goal.progressPercent + increment));
    onUpdateProgress(goal.id, newProgress);
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{goal.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
              {therapyTypeLabels[goal.therapyType]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[goal.status]}`}>
              {goal.status}
            </span>
          </div>
          {goal.description && (
            <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
          )}
          {goal.targetDate && (
            <p className="text-xs text-gray-500">
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-1 ml-4">
          <button
            onClick={() => onEdit(goal)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Edit goal"
          >
            <Edit2 className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 hover:bg-red-50 rounded"
            title="Delete goal"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold text-gray-900">{goal.progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${goal.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Progress Buttons */}
      {goal.status === 'active' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleQuickProgress(-10)}
            disabled={goal.progressPercent === 0}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -10%
          </button>
          <button
            onClick={() => handleQuickProgress(10)}
            disabled={goal.progressPercent === 100}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +10%
          </button>
          <button
            onClick={() => handleUpdateGoal(goal.id, { status: 'achieved', progressPercent: 100 })}
            className="text-xs px-2 py-1 border rounded hover:bg-green-50 border-green-300 text-green-700 ml-auto flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}

// Goal Form Modal Component
function GoalFormModal({
  childId,
  goal,
  onClose,
  onSubmit,
}: {
  childId: string;
  goal?: Goal;
  onClose: () => void;
  onSubmit: (input: CreateGoalInput | UpdateGoalInput) => void;
}) {
  const [formData, setFormData] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    therapyType: (goal?.therapyType || "aac") as TherapyType,
    category: goal?.category || "",
    targetDate: goal?.targetDate || "",
    progressPercent: goal?.progressPercent || 0,
    status: goal?.status || "active" as GoalStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleUpdateGoal = async (goalId: string, input: UpdateGoalInput) => {
    try {
      const response = await goalsApi.update(goalId, input);
      if (response.error) {
        alert("Failed to update goal: " + response.error);
        return;
      }
      onClose();
    } catch (err) {
      alert("Failed to update goal");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {goal ? "Edit Goal" : "Create New Goal"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Use 50 core words consistently"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Additional details about this goal..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Therapy Type *
                </label>
                <select
                  required
                  value={formData.therapyType}
                  onChange={(e) => setFormData({ ...formData, therapyType: e.target.value as TherapyType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="aac">AAC</option>
                  <option value="slp">SLP</option>
                  <option value="ot">OT</option>
                  <option value="aba">ABA</option>
                  <option value="pt">PT</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., communication"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {goal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as GoalStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="achieved">Achieved</option>
                    <option value="paused">Paused</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              )}
            </div>

            {goal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress: {formData.progressPercent}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progressPercent}
                  onChange={(e) => setFormData({ ...formData, progressPercent: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {goal ? "Save Changes" : "Create Goal"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
