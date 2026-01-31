import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { childrenApi, goalsApi, sessionsApi, type Child, type Goal, type TherapySession, type TherapyType } from "~/lib/api";
import { Button, Card, CardHeader, CardContent, CardTitle, Spinner, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@flynn-aac/shared-ui";

export const Route = createFileRoute("/_app/clients/$childId")({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { childId } = Route.useParams();
  const [child, setChild] = useState<Child | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    setLoading(true);

    const [childRes, goalsRes, sessionsRes] = await Promise.all([
      childrenApi.get(childId),
      goalsApi.listForChild(childId),
      sessionsApi.listForChild(childId),
    ]);

    if (childRes.data) setChild(childRes.data);
    if (goalsRes.data) setGoals(goalsRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Child not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{child.name}</h1>
        {child.birthDate && (
          <p className="text-gray-600">Born: {new Date(child.birthDate).toLocaleDateString()}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Goals */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Therapy Goals</h2>
              <Button
                onClick={() => setShowGoalForm(true)}
                size="sm"
              >
                Add Goal
              </Button>
            </div>

            {goals.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600">No goals set yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onUpdate={loadData} />
                ))}
              </div>
            )}
          </div>

          {showGoalForm && (
            <GoalFormModal
              childId={childId}
              onClose={() => setShowGoalForm(false)}
              onSuccess={() => {
                setShowGoalForm(false);
                loadData();
              }}
            />
          )}
        </div>

        {/* Right Column - Sessions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Sessions</h2>
            <button
              onClick={() => setShowSessionForm(true)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
            >
              Log Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-600 text-sm">No sessions logged</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 10).map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}

          {showSessionForm && (
            <SessionFormModal
              childId={childId}
              goals={goals}
              onClose={() => setShowSessionForm(false)}
              onSuccess={() => {
                setShowSessionForm(false);
                loadData();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, onUpdate }: { goal: Goal; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);

  const updateProgress = async (newProgress: number) => {
    setUpdating(true);
    await goalsApi.update(goal.id, { progressPercent: newProgress });
    setUpdating(false);
    onUpdate();
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    achieved: "bg-blue-100 text-blue-800",
    paused: "bg-yellow-100 text-yellow-800",
    discontinued: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{goal.title}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[goal.status]}`}>
          {goal.status}
        </span>
      </div>

      {goal.description && <p className="text-sm text-gray-600 mb-3">{goal.description}</p>}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-600 uppercase">{goal.therapyType}</span>
        {goal.category && <span className="text-xs text-gray-500">• {goal.category}</span>}
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{goal.progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${goal.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      {goal.status === "active" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => updateProgress(Math.min(100, goal.progressPercent + 10))}
            disabled={updating || goal.progressPercent >= 100}
            className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
          >
            +10%
          </button>
          <button
            onClick={() => updateProgress(100)}
            disabled={updating || goal.progressPercent === 100}
            className="px-3 py-1 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 disabled:opacity-50"
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: TherapySession }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs font-medium text-gray-600 uppercase">{session.therapyType}</span>
        <span className="text-xs text-gray-500">
          {session.durationMinutes ? `${session.durationMinutes}min` : ""}
        </span>
      </div>
      <p className="text-sm text-gray-900 font-medium">{new Date(session.sessionDate).toLocaleDateString()}</p>
      {session.notes && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{session.notes}</p>}
    </div>
  );
}

function GoalFormModal({
  childId,
  onClose,
  onSuccess,
}: {
  childId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [therapyType, setTherapyType] = useState<TherapyType>("slp");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    await goalsApi.create(childId, {
      title,
      description: description || undefined,
      therapyType,
      category: category || undefined,
      progressPercent: 0,
    });

    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">Add New Goal</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Therapy Type*</label>
            <select
              value={therapyType}
              onChange={(e) => setTherapyType(e.target.value as TherapyType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="slp">Speech-Language Pathology</option>
              <option value="ot">Occupational Therapy</option>
              <option value="aba">ABA Therapy</option>
              <option value="aac">AAC</option>
              <option value="pt">Physical Therapy</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Communication, Motor Skills"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SessionFormModal({
  childId,
  goals,
  onClose,
  onSuccess,
}: {
  childId: string;
  goals: Goal[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [therapyType, setTherapyType] = useState<TherapyType>("slp");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    await sessionsApi.create(childId, {
      therapyType,
      sessionDate,
      durationMinutes,
      notes: notes || undefined,
    });

    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">Log Therapy Session</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date*</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Therapy Type*</label>
            <select
              value={therapyType}
              onChange={(e) => setTherapyType(e.target.value as TherapyType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="slp">Speech-Language Pathology</option>
              <option value="ot">Occupational Therapy</option>
              <option value="aba">ABA Therapy</option>
              <option value="aac">AAC</option>
              <option value="pt">Physical Therapy</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="What was accomplished during this session?"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Logging..." : "Log Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
