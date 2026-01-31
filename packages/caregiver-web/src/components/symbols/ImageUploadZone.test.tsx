import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageUploadZone } from "./ImageUploadZone";

describe("ImageUploadZone", () => {
  const mockOnUploadComplete = vi.fn();
  const testId = "upload-zone";

  beforeEach(() => {
    mockOnUploadComplete.mockClear();
    // Mock FileReader
    global.FileReader = class {
      readAsDataURL = vi.fn(function (this: any) {
        this.onload?.({ target: { result: "data:image/png;base64,mock" } });
      });
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders upload zone with default state", () => {
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getByText(/drop image here or click to browse/i)).toBeInTheDocument();
      expect(screen.getByText(/png, jpg up to 5mb/i)).toBeInTheDocument();
      expect(screen.getByTestId(`${testId}-browse`)).toBeInTheDocument();
    });

    it("renders with custom max size", () => {
      render(
        <ImageUploadZone
          onUploadComplete={mockOnUploadComplete}
          maxSizeMB={10}
          testId={testId}
        />
      );

      expect(screen.getByText(/png, jpg up to 10mb/i)).toBeInTheDocument();
    });

    it("renders disabled state", () => {
      render(
        <ImageUploadZone onUploadComplete={mockOnUploadComplete} disabled testId={testId} />
      );

      const browseButton = screen.getByTestId(`${testId}-browse`);
      expect(browseButton).toBeDisabled();
      expect(screen.getByTestId(testId)).toHaveClass("opacity-50");
    });

    it("renders with category color preview", async () => {
      const user = userEvent.setup();
      render(
        <ImageUploadZone
          onUploadComplete={mockOnUploadComplete}
          categoryColor="#FFD700"
          testId={testId}
        />
      );

      // Upload a file
      const file = new File(["dummy content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        const preview = screen.getByTestId(`${testId}-preview`);
        expect(preview).toHaveStyle({ borderColor: "#FFD700" });
      });
    });
  });

  describe("File Selection via Browse Button", () => {
    it("opens file picker when browse button is clicked", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      const browseButton = screen.getByTestId(`${testId}-browse`);
      await user.click(browseButton);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("handles valid image file selection", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["dummy content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      // Should show preview
      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-preview`)).toBeInTheDocument();
      });

      // Should complete upload
      await waitFor(
        () => {
          expect(mockOnUploadComplete).toHaveBeenCalledWith(
            expect.stringContaining("https://placeholder-cdn.com/"),
            expect.stringContaining("custom-symbols/mock/")
          );
        },
        { timeout: 2000 }
      );
    });

    it("handles JPEG files", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-preview`)).toBeInTheDocument();
      });
    });
  });

  describe("Drag and Drop", () => {
    const createDragEvent = (type: string, file: File) => {
      const event = new Event(type, { bubbles: true }) as any;
      event.dataTransfer = {
        files: [file],
        types: ["Files"],
      };
      return event;
    };

    it("handles drag over", () => {
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const zone = screen.getByTestId(testId);
      const file = new File(["content"], "test.png", { type: "image/png" });

      fireEvent(zone, createDragEvent("dragover", file));

      expect(zone).toHaveClass("border-primary");
      expect(screen.getByText(/drop image here/i)).toBeInTheDocument();
    });

    it("handles drag leave", () => {
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const zone = screen.getByTestId(testId);
      const file = new File(["content"], "test.png", { type: "image/png" });

      fireEvent(zone, createDragEvent("dragover", file));
      expect(zone).toHaveClass("border-primary");

      fireEvent.dragLeave(zone);
      expect(zone).not.toHaveClass("border-primary");
    });

    it("handles file drop", async () => {
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const zone = screen.getByTestId(testId);
      const file = new File(["content"], "test.png", { type: "image/png" });

      fireEvent(zone, createDragEvent("drop", file));

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-preview`)).toBeInTheDocument();
      });
    });

    it("ignores drop when disabled", () => {
      render(
        <ImageUploadZone onUploadComplete={mockOnUploadComplete} disabled testId={testId} />
      );

      const zone = screen.getByTestId(testId);
      const file = new File(["content"], "test.png", { type: "image/png" });

      fireEvent(zone, createDragEvent("drop", file));

      expect(screen.queryByTestId(`${testId}-preview`)).not.toBeInTheDocument();
    });
  });

  describe("File Validation", () => {
    it("rejects files that are too large", async () => {
      const user = userEvent.setup();
      render(
        <ImageUploadZone onUploadComplete={mockOnUploadComplete} maxSizeMB={1} testId={testId} />
      );

      // Create 2MB file
      const largeFile = new File([new ArrayBuffer(2 * 1024 * 1024)], "large.png", {
        type: "image/png",
      });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, largeFile);

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });

      expect(mockOnUploadComplete).not.toHaveBeenCalled();
    });

    it("rejects invalid file types", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const invalidFile = new File(["content"], "test.pdf", { type: "application/pdf" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, invalidFile);

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });

      expect(mockOnUploadComplete).not.toHaveBeenCalled();
    });

    it("shows error message in UI when validation fails", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const invalidFile = new File(["content"], "test.txt", { type: "text/plain" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, invalidFile);

      await waitFor(() => {
        const errorElement = screen.getByTestId(`${testId}-error`);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/invalid file type/i);
      });
    });

    it("applies error styling when validation fails", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const invalidFile = new File(["content"], "test.txt", { type: "text/plain" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, invalidFile);

      await waitFor(() => {
        const zone = screen.getByTestId(testId);
        expect(zone).toHaveClass("border-red-500");
      });
    });
  });

  describe("Upload Progress", () => {
    it("shows upload progress indicator", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      // Progress bar should appear
      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-progress`)).toBeInTheDocument();
      });

      // Should show loading spinner
      expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument(); // Loader2 icon
    });

    it("shows success checkmark after upload completes", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(
        () => {
          expect(screen.getByTestId(`${testId}-success`)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it("hides progress indicator after upload completes", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(
        () => {
          expect(screen.queryByTestId(`${testId}-progress`)).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe("Remove Functionality", () => {
    it("shows remove button after image is uploaded", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-remove`)).toBeInTheDocument();
      });
    });

    it("removes preview and resets state when remove is clicked", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-preview`)).toBeInTheDocument();
      });

      const removeButton = screen.getByTestId(`${testId}-remove`);
      await user.click(removeButton);

      expect(screen.queryByTestId(`${testId}-preview`)).not.toBeInTheDocument();
      expect(screen.getByText(/drop image here or click to browse/i)).toBeInTheDocument();
    });

    it("clears error state when remove is clicked", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      // Upload invalid file to trigger error
      const invalidFile = new File(["content"], "test.txt", { type: "text/plain" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;
      await user.upload(input, invalidFile);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-error`)).toBeInTheDocument();
      });

      // Upload valid file
      const validFile = new File(["content"], "test.png", { type: "image/png" });
      await user.upload(input, validFile);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-remove`)).toBeInTheDocument();
      });

      // Remove and verify error is cleared
      const removeButton = screen.getByTestId(`${testId}-remove`);
      await user.click(removeButton);

      expect(screen.queryByTestId(`${testId}-error`)).not.toBeInTheDocument();
    });

    it("hides remove button during upload", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["content"], "test.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      // During upload, remove button should not be visible
      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-progress`)).toBeInTheDocument();
      });

      expect(screen.queryByTestId(`${testId}-remove`)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const zone = screen.getByTestId(testId);
      expect(zone).toHaveAttribute("role", "button");
      expect(zone).toHaveAttribute("aria-label", "Upload image");
      expect(zone).toHaveAttribute("tabIndex", "0");
    });

    it("disables tabIndex when disabled", () => {
      render(
        <ImageUploadZone onUploadComplete={mockOnUploadComplete} disabled testId={testId} />
      );

      const zone = screen.getByTestId(testId);
      expect(zone).toHaveAttribute("tabIndex", "-1");
      expect(zone).toHaveAttribute("aria-disabled", "true");
    });

    it("can be activated via keyboard", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const zone = screen.getByTestId(testId);
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      zone.focus();
      await user.keyboard("{Enter}");

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("handles multiple rapid file selections", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;
      const file1 = new File(["content1"], "test1.png", { type: "image/png" });
      const file2 = new File(["content2"], "test2.png", { type: "image/png" });

      await user.upload(input, file1);
      await user.upload(input, file2);

      // Should only process the last file
      await waitFor(
        () => {
          expect(mockOnUploadComplete).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 }
      );
    });

    it("handles file with no extension", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["content"], "testfile", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-preview`)).toBeInTheDocument();
      });
    });

    it("handles very small files", async () => {
      const user = userEvent.setup();
      render(<ImageUploadZone onUploadComplete={mockOnUploadComplete} testId={testId} />);

      const file = new File(["x"], "tiny.png", { type: "image/png" });
      const input = screen.getByTestId(`${testId}-input`) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId(`${testId}-preview`)).toBeInTheDocument();
      });
    });
  });
});
