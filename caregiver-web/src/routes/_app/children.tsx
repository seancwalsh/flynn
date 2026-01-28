import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/children")({
  component: ChildrenPage,
});

function ChildrenPage() {
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
        <button className="btn-primary">Add Child</button>
      </div>

      {/* Empty State */}
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
          <button className="btn-primary">Add Your First Child</button>
        </div>
      </div>
    </div>
  );
}
