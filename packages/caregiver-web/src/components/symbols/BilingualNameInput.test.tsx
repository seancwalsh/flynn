import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BilingualNameInput } from "./BilingualNameInput";

describe("BilingualNameInput", () => {
  const mockOnChangeEn = vi.fn();
  const mockOnChangeBg = vi.fn();
  const testId = "test-input";

  beforeEach(() => {
    mockOnChangeEn.mockClear();
    mockOnChangeBg.mockClear();
  });

  describe("Rendering", () => {
    it("renders both input fields", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getByTestId(`${testId}-en-input`)).toBeInTheDocument();
      expect(screen.getByTestId(`${testId}-bg-input`)).toBeInTheDocument();
    });

    it("renders with correct labels", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      expect(screen.getByText("Symbol Name (English)")).toBeInTheDocument();
      expect(screen.getByText("Име (Bulgarian)")).toBeInTheDocument();
    });

    it("displays current values", () => {
      render(
        <BilingualNameInput
          nameEn="Hello"
          nameBg="Здравей"
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Здравей")).toBeInTheDocument();
    });

    it("shows placeholders when empty", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const enInput = screen.getByTestId(`${testId}-en-input`);
      const bgInput = screen.getByTestId(`${testId}-bg-input`);

      expect(enInput).toHaveAttribute("placeholder", "e.g., Pizza");
      expect(bgInput).toHaveAttribute("placeholder", "e.g., Пица");
    });
  });

  describe("User Input", () => {
    it("calls onChangeEn when English input changes", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "Test");

      expect(mockOnChangeEn).toHaveBeenCalledTimes(4); // Once per character
      expect(mockOnChangeEn).toHaveBeenLastCalledWith("Test");
    });

    it("calls onChangeBg when Bulgarian input changes", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-bg-input`);
      await user.type(input, "Тест");

      expect(mockOnChangeBg).toHaveBeenCalledTimes(4);
      expect(mockOnChangeBg).toHaveBeenLastCalledWith("Тест");
    });

    it("enforces maxLength of 100 characters", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const enInput = screen.getByTestId(`${testId}-en-input`);
      const bgInput = screen.getByTestId(`${testId}-bg-input`);

      expect(enInput).toHaveAttribute("maxLength", "100");
      expect(bgInput).toHaveAttribute("maxLength", "100");
    });
  });

  describe("Auto-Translation", () => {
    it("shows translation suggestion for known words", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "pizza");

      // Wait for debounced translation
      await waitFor(
        () => {
          expect(screen.getByTestId(`${testId}-suggestion-hint`)).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      expect(screen.getByText(/пица/i)).toBeInTheDocument();
    });

    it("shows translating indicator while fetching translation", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "hello");

      // Should briefly show "Translating..." indicator
      await waitFor(() => {
        expect(screen.getByText(/translating/i)).toBeInTheDocument();
      });
    });

    it("shows use suggestion button when translation available", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "water");

      await waitFor(
        () => {
          expect(screen.getByTestId(`${testId}-use-suggestion`)).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it("applies suggestion when use suggestion button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "water");

      await waitFor(
        () => {
          expect(screen.getByTestId(`${testId}-use-suggestion`)).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      const useSuggestionBtn = screen.getByTestId(`${testId}-use-suggestion`);
      await user.click(useSuggestionBtn);

      expect(mockOnChangeBg).toHaveBeenCalledWith("вода");
    });

    it("hides suggestion when user types in Bulgarian field", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn="hello"
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      // Wait for suggestion to appear
      await waitFor(
        () => {
          expect(screen.getByTestId(`${testId}-use-suggestion`)).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // Type in Bulgarian field
      const bgInput = screen.getByTestId(`${testId}-bg-input`);
      await user.type(bgInput, "здр");

      // Suggestion should disappear
      await waitFor(() => {
        expect(screen.queryByTestId(`${testId}-use-suggestion`)).not.toBeInTheDocument();
      });
    });

    it("does not show suggestion if Bulgarian field already has value", async () => {
      render(
        <BilingualNameInput
          nameEn="hello"
          nameBg="здравей"
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      // Should not show suggestion button
      await waitFor(
        () => {
          expect(screen.queryByTestId(`${testId}-use-suggestion`)).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it("does not auto-translate when autoTranslate is false", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={false}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "hello");

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(screen.queryByTestId(`${testId}-suggestion-hint`)).not.toBeInTheDocument();
    });

    it("debounces translation requests", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);

      // Type quickly
      await user.type(input, "hel");

      // Wait less than debounce time
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not show suggestion yet
      expect(screen.queryByTestId(`${testId}-suggestion-hint`)).not.toBeInTheDocument();

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByTestId(`${testId}-suggestion-hint`)).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it("does not suggest for very short English text", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "h");

      // Wait
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should not show suggestion for single character
      expect(screen.queryByTestId(`${testId}-suggestion-hint`)).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("disables both inputs when disabled prop is true", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          disabled={true}
          testId={testId}
        />
      );

      expect(screen.getByTestId(`${testId}-en-input`)).toBeDisabled();
      expect(screen.getByTestId(`${testId}-bg-input`)).toBeDisabled();
    });

    it("disables use suggestion button when disabled", async () => {
      render(
        <BilingualNameInput
          nameEn="hello"
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          disabled={true}
          autoTranslate={true}
          testId={testId}
        />
      );

      await waitFor(
        () => {
          const btn = screen.queryByTestId(`${testId}-use-suggestion`);
          if (btn) {
            expect(btn).toBeDisabled();
          }
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const enInput = screen.getByTestId(`${testId}-en-input`);
      const bgInput = screen.getByTestId(`${testId}-bg-input`);

      expect(enInput).toHaveAttribute("aria-label", "English symbol name");
      expect(bgInput).toHaveAttribute("aria-label", "Bulgarian symbol name");
    });

    it("associates labels with inputs", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const enInput = screen.getByTestId(`${testId}-en-input`);
      const bgInput = screen.getByTestId(`${testId}-bg-input`);

      expect(enInput).toHaveAttribute("id", `${testId}-en`);
      expect(bgInput).toHaveAttribute("id", `${testId}-bg`);

      const enLabel = screen.getByText("Symbol Name (English)");
      const bgLabel = screen.getByText("Име (Bulgarian)");

      expect(enLabel).toHaveAttribute("for", `${testId}-en`);
      expect(bgLabel).toHaveAttribute("for", `${testId}-bg`);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty English input", () => {
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      expect(screen.getByTestId(`${testId}-en-input`)).toHaveValue("");
    });

    it("handles special characters in input", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "Café");

      expect(mockOnChangeEn).toHaveBeenLastCalledWith("Café");
    });

    it("handles Cyrillic input in Bulgarian field", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-bg-input`);
      await user.type(input, "Здравей");

      expect(mockOnChangeBg).toHaveBeenLastCalledWith("Здравей");
    });

    it("handles unknown words gracefully", async () => {
      const user = userEvent.setup();
      render(
        <BilingualNameInput
          nameEn=""
          nameBg=""
          onChangeEn={mockOnChangeEn}
          onChangeBg={mockOnChangeBg}
          autoTranslate={true}
          testId={testId}
        />
      );

      const input = screen.getByTestId(`${testId}-en-input`);
      await user.type(input, "xyzabc");

      // Wait for translation attempt
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should not show suggestion for unknown words
      expect(screen.queryByTestId(`${testId}-suggestion-hint`)).not.toBeInTheDocument();
    });
  });
});
