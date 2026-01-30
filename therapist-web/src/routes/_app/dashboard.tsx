import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { therapistApi, type TherapistClient } from "~/lib/api";
import { useAuth } from "~/lib/auth";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { therapistId } = useAuth();
  const [clients, setClients] = useState<TherapistClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    if (!therapistId) return;

    setLoading(true);
    setError(null);

    const response = await therapistApi.listClients(therapistId);

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setClients(response.data);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading clients: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Clients</h1>
        <p className="text-gray-600">View and manage your assigned clients</p>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients assigned</h3>
          <p className="text-gray-600">You don't have any clients assigned yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link
              key={client.childId}
              to="/clients/$childId"
              params={{ childId: client.childId }}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">
                    {client.child.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.child.name}</h3>

              {client.child.birthDate && (
                <p className="text-sm text-gray-600 mb-3">
                  Born: {new Date(client.child.birthDate).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Assigned {new Date(client.grantedAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
