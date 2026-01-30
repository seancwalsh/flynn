import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { childrenApi, familiesApi, type Child, type CreateChildInput } from "~/lib/api";
import { ChildCard } from "~/components/children/ChildCard";
import { AddChildModal } from "~/components/children/AddChildModal";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_app/children/")({
  component: ChildrenPage,
});

function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Get user's family first
      const familiesResponse = await familiesApi.list();
      if (familiesResponse.error) {
        throw new Error(familiesResponse.error);
      }

      const families = familiesResponse.data?.data || [];
      if (families.length > 0) {
        setFamilyId(families[0].id);
      }

      // Get children
      const childrenResponse = await childrenApi.list();
      if (childrenResponse.error) {
        throw new Error(childrenResponse.error);
      }

      setChildren(childrenResponse.data?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChild = async (data: CreateChildInput) => {
    const response = await childrenApi.create(data);
    if (response.error) {
      throw new Error(response.error);
    }
    if (response.data?.data) {
      setChildren([...children, response.data.data]);
    }
  };

  const handleDeleteChild = async (id: string) => {
    if (!confirm("Are you sure you want to delete this child? This action cannot be undone.")) {
      return;
    }

    const response = await childrenApi.delete(id);
    if (response.error) {
      alert(`Failed to delete: ${response.error}`);
      return;
    }

    setChildren(children.filter((c) => c.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
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
            <h3 className="font-semibold">Error loading children</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <Button onClick={loadData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Children</h1>
          <p className="text-gray-600 mt-1">
            Manage profiles for the children you support.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          disabled={!familyId}
        >
          Add Child
        </Button>
      </div>

      {/* Content */}
      {children.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
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
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No children yet
            </h3>
            <p className="text-gray-500 max-w-sm mb-6">
              Add a child's profile to start tracking their communication progress
              and customize their AAC experience.
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              disabled={!familyId}
            >
              Add Your First Child
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onEdit={() => {
                // TODO: Implement edit modal
                alert("Edit functionality coming soon!");
              }}
              onDelete={() => handleDeleteChild(child.id)}
            />
          ))}
        </div>
      )}

      {/* Add Child Modal */}
      {familyId && (
        <AddChildModal
          familyId={familyId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddChild}
        />
      )}
    </div>
  );
}
