import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button, Card } from "@flynn-aac/shared-ui";
import {
  symbolsApi,
  childrenApi,
  type CustomSymbolWithCategory,
  type SymbolCategory,
  type Child,
} from "~/lib/api";
import { Plus, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { CreateSymbolModal } from "~/components/CreateSymbolModal";

export const Route = createFileRoute("/_app/children/$childId/symbols")({
  component: SymbolsManagementPage,
});

function SymbolsManagementPage() {
  const params = useParams({ strict: false });
  const childId = params.childId as string;

  const [child, setChild] = useState<Child | null>(null);
  const [symbols, setSymbols] = useState<CustomSymbolWithCategory[]>([]);
  const [categories, setCategories] = useState<SymbolCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    loadData();
  }, [childId, filter]);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      // Load child info, symbols, and categories in parallel
      const [childResponse, symbolsResponse, categoriesResponse] = await Promise.all([
        childrenApi.get(childId),
        symbolsApi.getCustomSymbols(childId, filter === "all" ? undefined : filter),
        symbolsApi.getCategories(),
      ]);

      if (childResponse.error) {
        setError(childResponse.error);
        return;
      }

      if (symbolsResponse.error) {
        setError(symbolsResponse.error);
        return;
      }

      if (categoriesResponse.error) {
        setError(categoriesResponse.error);
        return;
      }

      setChild(childResponse.data?.data || null);
      setSymbols(symbolsResponse.data?.data || []);
      setCategories(categoriesResponse.data?.data || []);
    } catch (err) {
      setError("Failed to load symbols");
      console.error("Error loading symbols:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteSymbol(symbolId: string) {
    if (!confirm("Are you sure you want to delete this symbol?")) {
      return;
    }

    try {
      const response = await symbolsApi.deleteCustomSymbol(symbolId);
      if (response.error) {
        alert("Failed to delete symbol: " + response.error);
        return;
      }

      // Reload symbols
      loadData();
    } catch (err) {
      alert("Failed to delete symbol");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading symbols...</span>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <p className="text-red-600">{error || "Failed to load child"}</p>
          <Button onClick={loadData} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const pendingCount = symbols.filter((s) => s.status === "pending").length;
  const approvedCount = symbols.filter((s) => s.status === "approved").length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/children/$childId"
          params={{ childId }}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {child.name}'s Profile
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Symbols</h1>
            <p className="text-gray-600 mt-1">
              Create and manage custom symbols for {child.name}'s communication board
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create Symbol
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Total Symbols</p>
          <p className="text-3xl font-bold">{symbols.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("rejected")}
        >
          Rejected
        </Button>
      </div>

      {/* Symbols Grid */}
      {symbols.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No symbols yet</h3>
          <p className="text-gray-600 mb-6">
            {filter === "all"
              ? `Create custom symbols to personalize ${child.name}'s communication board`
              : `No ${filter} symbols found`}
          </p>
          {filter === "all" && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Symbol
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {symbols.map((symbol) => (
            <SymbolCard
              key={symbol.id}
              symbol={symbol}
              onDelete={handleDeleteSymbol}
            />
          ))}
        </div>
      )}

      {/* Create Symbol Modal */}
      {showCreateModal && (
        <CreateSymbolModal
          childId={childId}
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Symbol Card Component
function SymbolCard({
  symbol,
  onDelete,
}: {
  symbol: CustomSymbolWithCategory;
  onDelete: (id: string) => void;
}) {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    approved: "bg-green-100 text-green-700 border-green-300",
    rejected: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <Card className="overflow-hidden">
      {/* Symbol Image/Placeholder */}
      <div
        className="h-48 flex items-center justify-center border-b-4"
        style={{
          backgroundColor: symbol.category?.colorHex
            ? `${symbol.category.colorHex}20`
            : "#f0f0f0",
          borderColor: symbol.category?.colorHex || "#e0e0e0",
        }}
      >
        {symbol.imageUrl ? (
          <img
            src={symbol.imageUrl}
            alt={symbol.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-6xl font-bold opacity-20">
              {symbol.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Symbol Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{symbol.name}</h3>
            {symbol.nameBulgarian && (
              <p className="text-sm text-gray-600">{symbol.nameBulgarian}</p>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => onDelete(symbol.id)}
              className="p-1 hover:bg-red-50 rounded"
              title="Delete symbol"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        </div>

        {/* Category Badge */}
        {symbol.category && (
          <div
            className="inline-block px-2 py-1 rounded text-xs font-medium mb-2"
            style={{
              backgroundColor: `${symbol.category.colorHex}20`,
              color: symbol.category.colorHex,
            }}
          >
            {symbol.category.name}
          </div>
        )}

        {/* Status Badge */}
        <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ml-2 ${statusColors[symbol.status]}`}>
          {symbol.status.charAt(0).toUpperCase() + symbol.status.slice(1)}
        </div>

        {/* Metadata */}
        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
          <p>Source: {symbol.imageSource === "upload" ? "Uploaded" : symbol.imageSource === "url" ? "URL" : "AI Generated"}</p>
          <p>Created: {new Date(symbol.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </Card>
  );
}
