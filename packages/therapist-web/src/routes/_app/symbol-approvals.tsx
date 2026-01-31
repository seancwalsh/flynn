import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Check, X, Edit2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button, Card } from "@flynn-aac/shared-ui";
import { symbolsApi, type CustomSymbolWithCategory } from "~/lib/api";

export const Route = createFileRoute("/_app/symbol-approvals")({
  component: SymbolApprovalsPage,
});

function SymbolApprovalsPage() {
  const [pendingSymbols, setPendingSymbols] = useState<CustomSymbolWithCategory[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPendingSymbols();
  }, []);

  async function loadPendingSymbols() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await symbolsApi.getPendingSymbols();

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data?.data) {
        setPendingSymbols(response.data.data);
      }
    } catch (err) {
      setError("Failed to load pending symbols");
      console.error("Error loading pending symbols:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(symbolId: string, comment?: string) {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await symbolsApi.reviewSymbol(symbolId, {
        action: "approve",
        comment,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      // Move to next symbol
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsProcessing(false);
      }, 300);
    } catch (err) {
      setError("Failed to approve symbol");
      console.error("Error approving symbol:", err);
      setIsProcessing(false);
    }
  }

  async function handleReject(symbolId: string, comment?: string) {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await symbolsApi.reviewSymbol(symbolId, {
        action: "reject",
        comment,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      // Move to next symbol
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsProcessing(false);
      }, 300);
    } catch (err) {
      setError("Failed to reject symbol");
      console.error("Error rejecting symbol:", err);
      setIsProcessing(false);
    }
  }

  const currentSymbol = pendingSymbols[currentIndex];
  const remaining = pendingSymbols.length - currentIndex;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading pending symbols...</span>
      </div>
    );
  }

  if (error && !currentSymbol) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadPendingSymbols} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentSymbol) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-12 text-center">
          <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
          <p className="text-muted-foreground">
            No pending symbols to review at this time.
          </p>
          <Button onClick={loadPendingSymbols} className="mt-6">
            Refresh
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Symbol Approval Queue</h1>
        <p className="text-muted-foreground">
          {remaining} symbol{remaining !== 1 ? "s" : ""} pending review
        </p>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      <div className="relative h-[600px]" data-testid="approval-queue">
        <SwipeableCard
          symbol={currentSymbol}
          onSwipeLeft={() => handleReject(currentSymbol.id)}
          onSwipeRight={() => handleApprove(currentSymbol.id)}
          onApprove={(comment) => handleApprove(currentSymbol.id, comment)}
          onReject={(comment) => handleReject(currentSymbol.id, comment)}
          disabled={isProcessing}
        />

        {/* Swipe hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Swipe left to reject
          </span>
          <span>|</span>
          <span className="flex items-center gap-1">
            Swipe right to approve
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

interface SwipeableCardProps {
  symbol: CustomSymbolWithCategory;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
  disabled?: boolean;
}

function SwipeableCard({
  symbol,
  onSwipeLeft,
  onSwipeRight,
  onApprove,
  onReject,
  disabled = false,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  function handleDragEnd(_: any, info: PanInfo) {
    if (disabled) return;

    const threshold = 100;

    if (info.offset.x > threshold) {
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    }
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, opacity }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      data-testid={`symbol-card-${symbol.id}`}
    >
      <Card className="h-full liquid-glass-navigation p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold">{symbol.name}</h3>
            {symbol.nameBulgarian && (
              <p className="text-muted-foreground">{symbol.nameBulgarian}</p>
            )}
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: symbol.category?.colorHex
                ? `${symbol.category.colorHex}20`
                : "#f0f0f0",
              color: symbol.category?.colorHex || "#000",
            }}
          >
            {symbol.category?.name || "Uncategorized"}
          </div>
        </div>

        {/* Symbol preview */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <div
            className="w-64 h-64 rounded-2xl p-6 border-4"
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
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(symbol.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Image Source</p>
            <p className="font-medium capitalize">{symbol.imageSource}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
            onClick={() => onReject()}
            disabled={disabled}
            data-testid="reject-button"
          >
            <X className="w-5 h-5 mr-2" />
            Reject
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              // TODO: Show quick edit modal
            }}
            disabled={disabled}
            data-testid="edit-button"
          >
            <Edit2 className="w-5 h-5" />
          </Button>

          <Button
            variant="default"
            size="lg"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            onClick={() => onApprove("Looks good!")}
            disabled={disabled}
            data-testid="approve-button"
          >
            <Check className="w-5 h-5 mr-2" />
            Approve
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
