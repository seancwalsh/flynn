import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryGrid, type Category } from "./CategoryGrid";

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "People",
    nameBulgarian: "Хора",
    colorName: "yellow",
    colorHex: "#FFD54F",
    displayOrder: 1,
  },
  {
    id: "cat-2",
    name: "Actions",
    nameBulgarian: "Действия",
    colorName: "green",
    colorHex: "#81C784",
    displayOrder: 2,
  },
  {
    id: "cat-3",
    name: "Objects",
    colorName: "orange",
    colorHex: "#FFB74D",
    displayOrder: 3,
  },
];

describe("CategoryGrid", () => {
  const mockOnSelect = vi.fn();
  const testId = "test-grid";

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe("Rendering", () => {
    it("renders all categories", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getByText("People")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("Objects")).toBeInTheDocument();
    });

    it("renders Bulgarian names when available", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.getByText("Хора")).toBeInTheDocument();
      expect(screen.getByText("Действия")).toBeInTheDocument();
    });

    it("does not render Bulgarian name when not provided", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      // "Objects" category has no Bulgarian name
      const objectsCategory = screen.getByTestId(`${testId}-category-cat-3`);
      expect(objectsCategory).not.toHaveTextContent(/[А-Яа-я]/); // No Cyrillic
    });

    it("renders color swatches with correct colors", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const swatch1 = screen.getByTestId(`${testId}-swatch-cat-1`);
      const swatch2 = screen.getByTestId(`${testId}-swatch-cat-2`);

      expect(swatch1).toHaveStyle({ backgroundColor: "#FFD54F" });
      expect(swatch2).toHaveStyle({ backgroundColor: "#81C784" });
    });

    it("renders empty state when no categories", () => {
      render(
        <CategoryGrid
          categories={[]}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.getByTestId(`${testId}-empty`)).toBeInTheDocument();
      expect(screen.getByText("No categories available")).toBeInTheDocument();
    });

    it("applies grid layout classes", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const grid = screen.getByTestId(testId).querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-2");
      expect(grid).toHaveClass("md:grid-cols-3");
    });
  });

  describe("Selection State", () => {
    it("shows checkmark on selected category", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.getByTestId(`${testId}-checkmark-cat-1`)).toBeInTheDocument();
      expect(screen.queryByTestId(`${testId}-checkmark-cat-2`)).not.toBeInTheDocument();
    });

    it("applies selected styling to selected category", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const selectedButton = screen.getByTestId(`${testId}-category-cat-1`);
      expect(selectedButton).toHaveClass("border-primary");
      expect(selectedButton).toHaveStyle({
        backgroundColor: "#FFD54F10",
        borderColor: "#FFD54F",
      });
    });

    it("does not apply selected styling to unselected categories", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const unselectedButton = screen.getByTestId(`${testId}-category-cat-2`);
      expect(unselectedButton).toHaveClass("border-muted");
      expect(unselectedButton).not.toHaveStyle({ borderColor: "#81C784" });
    });

    it("handles no selection (null)", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      mockCategories.forEach((cat) => {
        expect(screen.queryByTestId(`${testId}-checkmark-${cat.id}`)).not.toBeInTheDocument();
      });
    });
  });

  describe("Interaction", () => {
    it("calls onSelect when category is clicked", async () => {
      const user = userEvent.setup();
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const button = screen.getByTestId(`${testId}-category-cat-1`);
      await user.click(button);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(mockCategories[0]);
    });

    it("allows selecting different categories", async () => {
      const user = userEvent.setup();
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      await user.click(screen.getByTestId(`${testId}-category-cat-1`));
      expect(mockOnSelect).toHaveBeenCalledWith(mockCategories[0]);

      await user.click(screen.getByTestId(`${testId}-category-cat-2`));
      expect(mockOnSelect).toHaveBeenCalledWith(mockCategories[1]);

      expect(mockOnSelect).toHaveBeenCalledTimes(2);
    });

    it("allows re-selecting the same category", async () => {
      const user = userEvent.setup();
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const button = screen.getByTestId(`${testId}-category-cat-1`);
      await user.click(button);

      expect(mockOnSelect).toHaveBeenCalledWith(mockCategories[0]);
    });

    it("does not call onSelect when disabled", async () => {
      const user = userEvent.setup();
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          disabled
          testId={testId}
        />
      );

      const button = screen.getByTestId(`${testId}-category-cat-1`);
      await user.click(button);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it("applies hover styles on non-disabled buttons", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const button = screen.getByTestId(`${testId}-category-cat-1`);
      expect(button).toHaveClass("hover:scale-105");
      expect(button).toHaveClass("active:scale-95");
    });

    it("does not apply hover styles when disabled", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          disabled
          testId={testId}
        />
      );

      const button = screen.getByTestId(`${testId}-category-cat-1`);
      expect(button).toHaveClass("opacity-50");
      expect(button).toHaveClass("cursor-not-allowed");
    });
  });

  describe("Preview Image", () => {
    const previewImageUrl = "data:image/png;base64,mockdata";

    it("shows preview for selected category when image provided", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          previewImage={previewImageUrl}
          testId={testId}
        />
      );

      expect(screen.getByTestId(`${testId}-preview-cat-1`)).toBeInTheDocument();
    });

    it("does not show preview for unselected categories", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          previewImage={previewImageUrl}
          testId={testId}
        />
      );

      expect(screen.queryByTestId(`${testId}-preview-cat-2`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`${testId}-preview-cat-3`)).not.toBeInTheDocument();
    });

    it("does not show preview when no category selected", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          previewImage={previewImageUrl}
          testId={testId}
        />
      );

      mockCategories.forEach((cat) => {
        expect(screen.queryByTestId(`${testId}-preview-${cat.id}`)).not.toBeInTheDocument();
      });
    });

    it("does not show preview when no image provided", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.queryByTestId(`${testId}-preview-cat-1`)).not.toBeInTheDocument();
    });

    it("applies category color to preview container", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          previewImage={previewImageUrl}
          testId={testId}
        />
      );

      const preview = screen.getByTestId(`${testId}-preview-cat-1`);
      expect(preview).toHaveStyle({
        backgroundColor: "#FFD54F20",
        borderColor: "#FFD54F",
      });
    });

    it("renders preview image with correct src", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          previewImage={previewImageUrl}
          testId={testId}
        />
      );

      const preview = screen.getByTestId(`${testId}-preview-cat-1`);
      const img = preview.querySelector("img");
      expect(img).toHaveAttribute("src", previewImageUrl);
      expect(img).toHaveAttribute("alt", "Symbol preview");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on category buttons", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const button = screen.getByTestId(`${testId}-category-cat-1`);
      expect(button).toHaveAttribute("aria-label", "Select People category");
      expect(button).toHaveAttribute("aria-pressed", "false");
    });

    it("updates aria-pressed when category is selected", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId="cat-1"
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const selectedButton = screen.getByTestId(`${testId}-category-cat-1`);
      const unselectedButton = screen.getByTestId(`${testId}-category-cat-2`);

      expect(selectedButton).toHaveAttribute("aria-pressed", "true");
      expect(unselectedButton).toHaveAttribute("aria-pressed", "false");
    });

    it("disables buttons when disabled prop is true", () => {
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          disabled
          testId={testId}
        />
      );

      mockCategories.forEach((cat) => {
        const button = screen.getByTestId(`${testId}-category-${cat.id}`);
        expect(button).toBeDisabled();
      });
    });

    it("allows keyboard navigation between categories", async () => {
      const user = userEvent.setup();
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const firstButton = screen.getByTestId(`${testId}-category-cat-1`);
      firstButton.focus();

      await user.keyboard("{Tab}");

      const secondButton = screen.getByTestId(`${testId}-category-cat-2`);
      expect(secondButton).toHaveFocus();
    });

    it("can be activated via keyboard", async () => {
      const user = userEvent.setup();
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      const button = screen.getByTestId(`${testId}-category-cat-1`);
      button.focus();

      await user.keyboard("{Enter}");

      expect(mockOnSelect).toHaveBeenCalledWith(mockCategories[0]);
    });
  });

  describe("Edge Cases", () => {
    it("handles single category", () => {
      render(
        <CategoryGrid
          categories={[mockCategories[0]]}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.getByTestId(`${testId}-category-cat-1`)).toBeInTheDocument();
      expect(screen.queryByTestId(`${testId}-category-cat-2`)).not.toBeInTheDocument();
    });

    it("handles category with very long name", () => {
      const longCategory: Category = {
        id: "long",
        name: "This is a very long category name that should wrap properly",
        colorName: "blue",
        colorHex: "#2196F3",
        displayOrder: 1,
      };

      render(
        <CategoryGrid
          categories={[longCategory]}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.getByText(longCategory.name)).toBeInTheDocument();
    });

    it("handles missing optional fields", () => {
      const minimalCategory: Category = {
        id: "minimal",
        name: "Minimal",
        nameBulgarian: null,
        colorName: "gray",
        colorHex: "#757575",
        icon: null,
        displayOrder: 1,
      };

      render(
        <CategoryGrid
          categories={[minimalCategory]}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      expect(screen.getByText("Minimal")).toBeInTheDocument();
    });

    it("handles rapid category selections", async () => {
      const user = userEvent.setup();
      render(
        <CategoryGrid
          categories={mockCategories}
          selectedId={null}
          onSelect={mockOnSelect}
          testId={testId}
        />
      );

      await user.click(screen.getByTestId(`${testId}-category-cat-1`));
      await user.click(screen.getByTestId(`${testId}-category-cat-2`));
      await user.click(screen.getByTestId(`${testId}-category-cat-3`));

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });
  });
});
