import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import SymbolApprovalsPage from "./symbol-approvals";
import * as api from "~/lib/api";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  useTransform: () => ({ get: () => 0 }),
  PanInfo: {},
}));

// Mock API
vi.mock("~/lib/api", () => ({
  symbolsApi: {
    getPendingSymbols: vi.fn(),
    reviewSymbol: vi.fn(),
    getApprovalHistory: vi.fn(),
  },
}));

const mockSymbolsApi = api.symbolsApi as any;

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe("SymbolApprovalsPage", () => {
  const mockPendingSymbols = [
    {
      id: "sym-1",
      name: "Pizza",
      nameBulgarian: "Пица",
      imageUrl: "https://cdn.example.com/pizza.png",
      imageSource: "upload" as const,
      categoryId: "cat-1",
      status: "pending" as const,
      createdBy: "user-1",
      createdAt: "2024-01-01T00:00:00Z",
      child: {
        id: "child-1",
        name: "John Doe",
      },
      category: {
        id: "cat-1",
        name: "Food",
        colorName: "red",
        colorHex: "#EF5350",
      },
      createdByUser: {
        id: "user-1",
        email: "parent@example.com",
      },
    },
    {
      id: "sym-2",
      name: "Water",
      nameBulgarian: "Вода",
      imageUrl: "https://cdn.example.com/water.png",
      imageSource: "url" as const,
      categoryId: "cat-2",
      status: "pending" as const,
      createdBy: "user-2",
      createdAt: "2024-01-02T00:00:00Z",
      child: {
        id: "child-2",
        name: "Jane Smith",
      },
      category: {
        id: "cat-2",
        name: "Drinks",
        colorName: "blue",
        colorHex: "#42A5F5",
      },
      createdByUser: {
        id: "user-2",
        email: "caregiver@example.com",
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("shows loading spinner while fetching symbols", () => {
      mockSymbolsApi.getPendingSymbols.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<SymbolApprovalsPage />);

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      expect(screen.getByText("Loading pending symbols...")).toBeInTheDocument();
    });

    it("hides loading spinner after symbols are loaded", async () => {
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
      });
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no pending symbols", async () => {
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: [] },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("All Caught Up!")).toBeInTheDocument();
      expect(
        screen.getByText("No custom symbols pending approval at the moment.")
      ).toBeInTheDocument();
    });

    it("shows checkmark icon in empty state", async () => {
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: [] },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        const icon = screen.getByTestId("empty-state-icon");
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    it("shows error message when API fails", async () => {
      mockSymbolsApi.getPendingSymbols.mockRejectedValueOnce(
        new Error("Network error")
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("error-state")).toBeInTheDocument();
      });

      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("shows generic error when no error message", async () => {
      mockSymbolsApi.getPendingSymbols.mockRejectedValueOnce({});

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load pending symbols")
        ).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
      mockSymbolsApi.getPendingSymbols.mockRejectedValueOnce(
        new Error("Network error")
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("retry-button")).toBeInTheDocument();
      });
    });

    it("retries loading when retry button is clicked", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: { data: mockPendingSymbols } });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("retry-button")).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId("retry-button");
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockSymbolsApi.getPendingSymbols).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });
    });
  });

  describe("Symbol Card Rendering", () => {
    beforeEach(async () => {
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });
    });

    it("renders all pending symbols", () => {
      expect(screen.getByText("Pizza")).toBeInTheDocument();
      expect(screen.getByText("Water")).toBeInTheDocument();
    });

    it("displays English and Bulgarian names", () => {
      expect(screen.getByText("Pizza")).toBeInTheDocument();
      expect(screen.getByText("Пица")).toBeInTheDocument();
      expect(screen.getByText("Water")).toBeInTheDocument();
      expect(screen.getByText("Вода")).toBeInTheDocument();
    });

    it("shows child information", () => {
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });

    it("shows category information", () => {
      expect(screen.getByText(/Food/)).toBeInTheDocument();
      expect(screen.getByText(/Drinks/)).toBeInTheDocument();
    });

    it("shows caregiver email", () => {
      expect(screen.getByText(/parent@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/caregiver@example.com/)).toBeInTheDocument();
    });

    it("displays symbol images", () => {
      const images = screen.getAllByRole("img", { name: /symbol preview/i });
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute(
        "src",
        "https://cdn.example.com/pizza.png"
      );
      expect(images[1]).toHaveAttribute(
        "src",
        "https://cdn.example.com/water.png"
      );
    });

    it("applies category color to card border", () => {
      const cards = screen.getAllByTestId(/swipeable-card-/);
      expect(cards[0]).toHaveStyle({ borderColor: "#EF5350" });
      expect(cards[1]).toHaveStyle({ borderColor: "#42A5F5" });
    });

    it("shows queue counter", () => {
      expect(screen.getByTestId("queue-counter")).toBeInTheDocument();
      expect(screen.getByText("2 symbols pending review")).toBeInTheDocument();
    });
  });

  describe("Approve Action", () => {
    it("calls reviewSymbol API with approve action", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "approved" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockSymbolsApi.reviewSymbol).toHaveBeenCalledWith("sym-1", {
          action: "approve",
        });
      });
    });

    it("removes symbol from queue after approval", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "approved" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.queryByText("Pizza")).not.toBeInTheDocument();
      });

      // Water should still be visible
      expect(screen.getByText("Water")).toBeInTheDocument();
    });

    it("updates queue counter after approval", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "approved" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("2 symbols pending review")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText("1 symbol pending review")).toBeInTheDocument();
      });
    });

    it("disables approve button while processing", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(approveButton).toBeDisabled();
      });
    });

    it("shows loading state in approve button", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByTestId("approve-loading-sym-1")).toBeInTheDocument();
      });
    });

    it("handles approval error gracefully", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockRejectedValueOnce(
        new Error("Approval failed")
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to approve symbol:",
          expect.any(Error)
        );
      });

      // Symbol should still be visible after error
      expect(screen.getByText("Pizza")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Reject Action", () => {
    it("prompts for rejection comment", async () => {
      const user = userEvent.setup();
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Not clear enough");

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "rejected" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByTestId(/reject-button-/)[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(promptSpy).toHaveBeenCalledWith(
          "Rejection reason (will be visible to caregiver):"
        );
      });

      promptSpy.mockRestore();
    });

    it("calls reviewSymbol API with reject action and comment", async () => {
      const user = userEvent.setup();
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Not appropriate");

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "rejected" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByTestId(/reject-button-/)[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(mockSymbolsApi.reviewSymbol).toHaveBeenCalledWith("sym-1", {
          action: "reject",
          comment: "Not appropriate",
        });
      });

      promptSpy.mockRestore();
    });

    it("allows rejection without comment", async () => {
      const user = userEvent.setup();
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("");

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "rejected" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByTestId(/reject-button-/)[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(mockSymbolsApi.reviewSymbol).toHaveBeenCalledWith("sym-1", {
          action: "reject",
          comment: undefined,
        });
      });

      promptSpy.mockRestore();
    });

    it("cancels rejection if prompt is cancelled", async () => {
      const user = userEvent.setup();
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByTestId(/reject-button-/)[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(mockSymbolsApi.reviewSymbol).not.toHaveBeenCalled();
      });

      // Symbol should still be visible
      expect(screen.getByText("Pizza")).toBeInTheDocument();

      promptSpy.mockRestore();
    });

    it("removes symbol from queue after rejection", async () => {
      const user = userEvent.setup();
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Rejected");

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "rejected" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByTestId(/reject-button-/)[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.queryByText("Pizza")).not.toBeInTheDocument();
      });

      promptSpy.mockRestore();
    });

    it("disables reject button while processing", async () => {
      const user = userEvent.setup();
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Rejected");

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByTestId(/reject-button-/)[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(rejectButton).toBeDisabled();
      });

      promptSpy.mockRestore();
    });

    it("handles rejection error gracefully", async () => {
      const user = userEvent.setup();
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Rejected");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockRejectedValueOnce(
        new Error("Rejection failed")
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByTestId(/reject-button-/)[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to reject symbol:",
          expect.any(Error)
        );
      });

      // Symbol should still be visible after error
      expect(screen.getByText("Pizza")).toBeInTheDocument();

      promptSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Swipe Gestures", () => {
    it("renders swipeable card with motion props", async () => {
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: [mockPendingSymbols[0]] },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("swipeable-card-sym-1")).toBeInTheDocument();
      });
    });

    it("disables swipe when processing action", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];
      await user.click(approveButton);

      await waitFor(() => {
        const card = screen.getByTestId("swipeable-card-sym-1");
        expect(card).toHaveAttribute("data-disabled", "true");
      });
    });
  });

  describe("Accessibility", () => {
    beforeEach(async () => {
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });
    });

    it("has proper ARIA labels on buttons", () => {
      const approveButtons = screen.getAllByRole("button", { name: /approve/i });
      const rejectButtons = screen.getAllByRole("button", { name: /reject/i });

      expect(approveButtons).toHaveLength(2);
      expect(rejectButtons).toHaveLength(2);
    });

    it("has accessible image alt text", () => {
      const images = screen.getAllByRole("img", { name: /symbol preview/i });
      expect(images).toHaveLength(2);
    });

    it("uses semantic HTML structure", () => {
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles symbols without Bulgarian names", async () => {
      const symbolWithoutBulgarian = {
        ...mockPendingSymbols[0],
        nameBulgarian: null,
      };

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: [symbolWithoutBulgarian] },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      // Should not crash without Bulgarian name
      expect(screen.queryByText("Пица")).not.toBeInTheDocument();
    });

    it("handles missing image URLs", async () => {
      const symbolWithoutImage = {
        ...mockPendingSymbols[0],
        imageUrl: null,
      };

      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: [symbolWithoutImage] },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      // Should show placeholder icon
      expect(screen.getByTestId("image-placeholder-sym-1")).toBeInTheDocument();
    });

    it("shows empty state after approving all symbols", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: [mockPendingSymbols[0]] },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValueOnce({
        data: { data: { ...mockPendingSymbols[0], status: "approved" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getByTestId("approve-button-sym-1");
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText("All Caught Up!")).toBeInTheDocument();
      });
    });

    it("handles rapid approval clicks gracefully", async () => {
      const user = userEvent.setup();
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });
      mockSymbolsApi.reviewSymbol.mockResolvedValue({
        data: { data: { ...mockPendingSymbols[0], status: "approved" } },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText("Pizza")).toBeInTheDocument();
      });

      const approveButton = screen.getAllByTestId(/approve-button-/)[0];

      // Click multiple times rapidly
      await user.click(approveButton);
      await user.click(approveButton);
      await user.click(approveButton);

      // Should only call API once
      await waitFor(() => {
        expect(mockSymbolsApi.reviewSymbol).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Date Formatting", () => {
    it("formats creation date correctly", async () => {
      mockSymbolsApi.getPendingSymbols.mockResolvedValueOnce({
        data: { data: mockPendingSymbols },
      });

      renderWithRouter(<SymbolApprovalsPage />);

      await waitFor(() => {
        expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument();
        expect(screen.getByText(/1\/2\/2024/)).toBeInTheDocument();
      });
    });
  });
});
