import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateSymbolModal } from "./CreateSymbolModal";
import { symbolsApi } from "~/lib/api";

// Mock the API
vi.mock("~/lib/api", () => ({
  symbolsApi: {
    getCategories: vi.fn(),
    createCustomSymbol: vi.fn(),
  },
}));

const mockCategories = [
  {
    id: "cat-1",
    name: "People",
    nameBulgarian: "Хора",
    colorName: "yellow",
    colorHex: "#FFD54F",
    icon: null,
    displayOrder: 1,
    isSystem: true,
    createdAt: "2024-01-01",
  },
  {
    id: "cat-2",
    name: "Actions",
    nameBulgarian: "Действия",
    colorName: "green",
    colorHex: "#81C784",
    icon: null,
    displayOrder: 2,
    isSystem: true,
    createdAt: "2024-01-01",
  },
];

describe("CreateSymbolModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const testId = "test-modal";
  const childId = "child-123";

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock FileReader
    global.FileReader = class {
      readAsDataURL = vi.fn(function (this: any) {
        this.onload?.({ target: { result: "data:image/png;base64,mock" } });
      });
    } as any;
  });

  describe("Rendering", () => {
    it("renders modal when open", async () => {
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });

      expect(screen.getByText("Create Custom Symbol")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={false}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    });

    it("renders all form sections", async () => {
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-name-input`)).toBeInTheDocument();
        expect(screen.getByTestId(`${testId}-category-grid`)).toBeInTheDocument();
        expect(screen.getByTestId(`${testId}-image-upload`)).toBeInTheDocument();
      });
    });
  });

  describe("Category Loading", () => {
    it("shows loading state while fetching categories", () => {
      (symbolsApi.getCategories as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      expect(screen.getByText("Loading categories...")).toBeInTheDocument();
    });

    it("loads categories on mount", async () => {
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(symbolsApi.getCategories).toHaveBeenCalled();
        expect(screen.getByText("People")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
      });
    });

    it("handles category loading error", async () => {
      (symbolsApi.getCategories as any).mockResolvedValue({ error: "Failed to load" });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-error`)).toBeInTheDocument();
        expect(screen.getByText(/Failed to load categories/i)).toBeInTheDocument();
      });
    });

    it("reloads categories when modal reopens", async () => {
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      const { rerender } = render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(symbolsApi.getCategories).toHaveBeenCalledTimes(1);
      });

      // Close modal
      rerender(
        <CreateSymbolModal
          isOpen={false}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      // Reopen modal
      rerender(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(symbolsApi.getCategories).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Form Interaction", () => {
    it("allows filling in all form fields", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-name-input`)).toBeInTheDocument();
      });

      // Fill in English name
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      // Fill in Bulgarian name
      const bgInput = screen.getByTestId(`${testId}-name-input-bg-input`);
      await user.type(bgInput, "Пица");

      // Select category
      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      // Upload image
      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      expect(enInput).toHaveValue("Pizza");
      expect(bgInput).toHaveValue("Пица");
    });

    it("enables submit button when form is valid", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-submit`)).toBeDisabled();
      });

      // Fill form
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      // Wait for upload to complete
      await waitFor(
        () => {
          const submitButton = screen.getByTestId(`${testId}-submit`);
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );
    });

    it("keeps submit button disabled when form incomplete", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-submit`)).toBeDisabled();
      });

      // Only fill name, no category or image
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      const submitButton = screen.getByTestId(`${testId}-submit`);
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Form Validation", () => {
    it("shows error when submitting without name", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Select category and upload image, but no name
      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      // Submit button should still be disabled (no name)
      const submitButton = screen.getByTestId(`${testId}-submit`);
      expect(submitButton).toBeDisabled();
    });

    it("trims whitespace from names", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });
      (symbolsApi.createCustomSymbol as any).mockResolvedValue({
        data: { data: { id: "sym-1" } },
      });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Type name with whitespace
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "  Pizza  ");

      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      await waitFor(
        () => {
          const submitButton = screen.getByTestId(`${testId}-submit`);
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      const submitButton = screen.getByTestId(`${testId}-submit`);
      await user.click(submitButton);

      await waitFor(() => {
        expect(symbolsApi.createCustomSymbol).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Pizza", // Trimmed
          })
        );
      });
    });
  });

  describe("Form Submission", () => {
    it("submits form successfully", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });
      (symbolsApi.createCustomSymbol as any).mockResolvedValue({
        data: { data: { id: "sym-1", name: "Pizza" } },
      });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          onSuccess={mockOnSuccess}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Fill form
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      const bgInput = screen.getByTestId(`${testId}-name-input-bg-input`);
      await user.type(bgInput, "Пица");

      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      await waitFor(
        () => {
          const submitButton = screen.getByTestId(`${testId}-submit`);
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      // Submit
      const submitButton = screen.getByTestId(`${testId}-submit`);
      await user.click(submitButton);

      await waitFor(() => {
        expect(symbolsApi.createCustomSymbol).toHaveBeenCalledWith({
          childId,
          name: "Pizza",
          nameBulgarian: "Пица",
          categoryId: "cat-1",
          imageSource: "upload",
          imageKey: expect.stringContaining("custom-symbols"),
          imageUrl: expect.stringContaining("https://"),
        });
      });
    });

    it("shows success message after submission", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });
      (symbolsApi.createCustomSymbol as any).mockResolvedValue({
        data: { data: { id: "sym-1", name: "Pizza" } },
      });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Fill and submit form
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      await waitFor(
        () => {
          const submitButton = screen.getByTestId(`${testId}-submit`);
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      const submitButton = screen.getByTestId(`${testId}-submit`);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-success`)).toBeInTheDocument();
        expect(screen.getByText("Symbol Created!")).toBeInTheDocument();
      });
    });

    it("calls onSuccess callback after submission", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });
      (symbolsApi.createCustomSymbol as any).mockResolvedValue({
        data: { data: { id: "sym-1", name: "Pizza" } },
      });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          onSuccess={mockOnSuccess}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Fill and submit
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      await waitFor(
        () => {
          const submitButton = screen.getByTestId(`${testId}-submit`);
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      const submitButton = screen.getByTestId(`${testId}-submit`);
      await user.click(submitButton);

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledWith("sym-1");
        },
        { timeout: 2000 }
      );
    });

    it("handles submission error", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });
      (symbolsApi.createCustomSymbol as any).mockResolvedValue({
        error: "Symbol name already exists",
      });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Fill and submit
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      await waitFor(
        () => {
          const submitButton = screen.getByTestId(`${testId}-submit`);
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      const submitButton = screen.getByTestId(`${testId}-submit`);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Symbol name already exists")).toBeInTheDocument();
      });
    });

    it("disables form during submission", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });
      (symbolsApi.createCustomSymbol as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Fill form
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      const categoryButton = screen.getByTestId(`${testId}-category-grid-category-cat-1`);
      await user.click(categoryButton);

      const file = new File(["content"], "pizza.png", { type: "image/png" });
      const fileInput = screen.getByTestId(`${testId}-image-upload-input`);
      await user.upload(fileInput, file);

      await waitFor(
        () => {
          const submitButton = screen.getByTestId(`${testId}-submit`);
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      // Submit
      const submitButton = screen.getByTestId(`${testId}-submit`);
      await user.click(submitButton);

      // Form should be disabled
      expect(screen.getByText("Creating...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Modal Close", () => {
    it("closes modal when close button clicked", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-close`)).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId(`${testId}-close`);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("closes modal when cancel button clicked", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-cancel`)).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId(`${testId}-cancel`);
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("resets form when modal closes", async () => {
      const user = userEvent.setup();
      (symbolsApi.getCategories as any).mockResolvedValue({ data: { data: mockCategories } });

      const { rerender } = render(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-form`)).toBeInTheDocument();
      });

      // Fill form
      const enInput = screen.getByTestId(`${testId}-name-input-en-input`);
      await user.type(enInput, "Pizza");

      // Close modal
      rerender(
        <CreateSymbolModal
          isOpen={false}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Reopen modal
      rerender(
        <CreateSymbolModal
          isOpen={true}
          onClose={mockOnClose}
          childId={childId}
          testId={testId}
        />
      );

      await waitFor(() => {
        const input = screen.getByTestId(`${testId}-name-input-en-input`);
        expect(input).toHaveValue("");
      });
    });
  });
});
