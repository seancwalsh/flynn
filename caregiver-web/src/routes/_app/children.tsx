/**
 * Children Page
 * List and manage children profiles
 */

import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Plus, User, Calendar, ChevronRight } from "lucide-react";
import { childrenApi, type Child } from "~/lib/api";

export const Route = createFileRoute("/_app/children")({
  component: ChildrenPage,
});

function ChildrenPage() {
  const [children, setChildren] = React.useState<Child[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchChildren() {
      try {
        setIsLoading(true);
        const { data, error } = await childrenApi.list();
        if (error) {
          setError(error);
          return;
        }
        setChildren(data?.children || []);
      } catch (err) {
        setError("Failed to load children");
      } finally {
        setIsLoading(false);
      }
    }
    fetchChildren();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Children</h1>
          <p className="text-gray-600 mt-1">Manage your children's profiles</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="font-medium">Add Child</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      {/* Children List */}
      {children.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No children added yet</h3>
          <p className="text-gray-600 mb-6">Add your first child to start tracking their progress</p>
          <button className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors">
            Add Your First Child
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{child.name}</h3>
                    {child.birthDate && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(child.birthDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
