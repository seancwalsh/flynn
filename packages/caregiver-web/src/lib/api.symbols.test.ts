import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  symbolsApi,
  type SymbolCategory,
  type CustomSymbol,
  type CreateCustomSymbolInput,
} from "./api";

// Mock fetch
global.fetch = vi.fn();

describe("symbolsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockToken = "mock-jwt-token";
  const mockCategory: SymbolCategory = {
    id: "cat-1",
    name: "People",
    nameBulgarian: "Хора",
    colorName: "yellow",
    colorHex: "#FFD54F",
    icon: "person.fill",
    displayOrder: 1,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00Z",
  };

  const mockSymbol: CustomSymbol = {
    id: "sym-1",
    childId: "child-1",
    name: "Pizza",
    nameBulgarian: "Пица",
    categoryId: "cat-1",
    imageSource: "upload",
    imageUrl: "https://cdn.example.com/pizza.png",
    imagePrompt: null,
    imageKey: "custom-symbols/child-1/pizza.png",
    status: "pending",
    gridPosition: null,
    createdBy: "user-1",
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  describe("getCategories", () => {
    it("fetches categories successfully", async () => {
      const mockResponse = { data: [mockCategory] };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await symbolsApi.getCategories();

      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/categories"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("includes auth token when available", async () => {
      localStorage.setItem("clerkToken", mockToken);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await symbolsApi.getCategories();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it("handles error response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      });

      const result = await symbolsApi.getCategories();

      expect(result.error).toBe("Unauthorized");
      expect(result.data).toBeUndefined();
    });

    it("handles network error", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const result = await symbolsApi.getCategories();

      expect(result.error).toBe("Network error");
      expect(result.data).toBeUndefined();
    });
  });

  describe("createCategory", () => {
    it("creates category successfully", async () => {
      const input = {
        name: "New Category",
        nameBulgarian: "Нова категория",
        colorName: "blue",
        colorHex: "#2196F3",
        displayOrder: 10,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ...mockCategory, ...input } }),
      });

      const result = await symbolsApi.createCategory(input);

      expect(result.data?.data.name).toBe(input.name);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/categories"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(input),
        })
      );
    });
  });

  describe("getCustomSymbols", () => {
    it("fetches symbols for a child", async () => {
      const mockResponse = { data: [{ ...mockSymbol, category: null }] };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await symbolsApi.getCustomSymbols("child-1");

      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/child-1"),
        expect.any(Object)
      );
    });

    it("filters by status when provided", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await symbolsApi.getCustomSymbols("child-1", "approved");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/child-1?status=approved"),
        expect.any(Object)
      );
    });

    it("handles pending status filter", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await symbolsApi.getCustomSymbols("child-1", "pending");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=pending"),
        expect.any(Object)
      );
    });

    it("handles rejected status filter", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await symbolsApi.getCustomSymbols("child-1", "rejected");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("status=rejected"),
        expect.any(Object)
      );
    });
  });

  describe("createCustomSymbol", () => {
    it("creates symbol with upload source", async () => {
      const input: CreateCustomSymbolInput = {
        childId: "child-1",
        name: "Pizza",
        nameBulgarian: "Пица",
        categoryId: "cat-1",
        imageSource: "upload",
        imageKey: "custom-symbols/child-1/pizza.png",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSymbol }),
      });

      const result = await symbolsApi.createCustomSymbol(input);

      expect(result.data?.data.name).toBe("Pizza");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/custom"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(input),
        })
      );
    });

    it("creates symbol with URL source", async () => {
      const input: CreateCustomSymbolInput = {
        childId: "child-1",
        name: "Pizza",
        categoryId: "cat-1",
        imageSource: "url",
        imageUrl: "https://example.com/pizza.png",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSymbol }),
      });

      await symbolsApi.createCustomSymbol(input);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(input),
        })
      );
    });

    it("creates symbol with generate source", async () => {
      const input: CreateCustomSymbolInput = {
        childId: "child-1",
        name: "Pizza",
        categoryId: "cat-1",
        imageSource: "generate",
        imagePrompt: "A delicious pizza with pepperoni",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSymbol }),
      });

      await symbolsApi.createCustomSymbol(input);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(input),
        })
      );
    });

    it("handles validation error", async () => {
      const input: CreateCustomSymbolInput = {
        childId: "child-1",
        name: "Pizza",
        categoryId: "cat-1",
        imageSource: "upload",
        // Missing imageKey
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "imageKey is required" }),
      });

      const result = await symbolsApi.createCustomSymbol(input);

      expect(result.error).toBe("imageKey is required");
    });
  });

  describe("updateCustomSymbol", () => {
    it("updates symbol successfully", async () => {
      const input = {
        name: "Updated Pizza",
        nameBulgarian: "Обновена Пица",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ...mockSymbol, ...input } }),
      });

      const result = await symbolsApi.updateCustomSymbol("sym-1", input);

      expect(result.data?.data.name).toBe(input.name);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/custom/sym-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(input),
        })
      );
    });

    it("handles partial updates", async () => {
      const input = { name: "Only Name Updated" };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSymbol }),
      });

      await symbolsApi.updateCustomSymbol("sym-1", input);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(input),
        })
      );
    });
  });

  describe("deleteCustomSymbol", () => {
    it("deletes symbol successfully", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await symbolsApi.deleteCustomSymbol("sym-1");

      expect(result.data?.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/custom/sym-1"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("handles not found error", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Symbol not found" }),
      });

      const result = await symbolsApi.deleteCustomSymbol("nonexistent");

      expect(result.error).toBe("Symbol not found");
    });
  });

  describe("getPendingSymbols", () => {
    it("fetches pending symbols for approval", async () => {
      const mockResponse = { data: [{ ...mockSymbol, category: null }] };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await symbolsApi.getPendingSymbols();

      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/pending/all"),
        expect.any(Object)
      );
    });

    it("requires authentication", async () => {
      localStorage.setItem("clerkToken", mockToken);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await symbolsApi.getPendingSymbols();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });
  });

  describe("reviewSymbol", () => {
    it("approves symbol successfully", async () => {
      const input = { action: "approve" as const, comment: "Looks good!" };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockSymbol, status: "approved", approvedBy: "user-1" },
        }),
      });

      const result = await symbolsApi.reviewSymbol("sym-1", input);

      expect(result.data?.data.status).toBe("approved");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/custom/sym-1/review"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(input),
        })
      );
    });

    it("rejects symbol with comment", async () => {
      const input = { action: "reject" as const, comment: "Not appropriate" };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ...mockSymbol, status: "rejected", rejectionReason: input.comment },
        }),
      });

      const result = await symbolsApi.reviewSymbol("sym-1", input);

      expect(result.data?.data.status).toBe("rejected");
      expect(result.data?.data.rejectionReason).toBe(input.comment);
    });

    it("requests changes", async () => {
      const input = {
        action: "request_changes" as const,
        comment: "Please use a clearer image",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSymbol }),
      });

      await symbolsApi.reviewSymbol("sym-1", input);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(input),
        })
      );
    });
  });

  describe("getApprovalHistory", () => {
    it("fetches approval history", async () => {
      const mockHistory = [
        {
          id: "approval-1",
          symbolId: "sym-1",
          reviewerId: "user-1",
          action: "approve",
          comment: "Looks good",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockHistory }),
      });

      const result = await symbolsApi.getApprovalHistory("sym-1");

      expect(result.data?.data).toEqual(mockHistory);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/custom/sym-1/approvals"),
        expect.any(Object)
      );
    });
  });

  describe("getUploadUrl", () => {
    it("gets presigned upload URL", async () => {
      const input = {
        filename: "pizza.png",
        contentType: "image/png",
      };

      const mockResponse = {
        uploadUrl: "https://r2.example.com/presigned-url",
        imageKey: "custom-symbols/child-1/123-pizza.png",
        publicUrl: "https://cdn.example.com/custom-symbols/child-1/123-pizza.png",
        expiresIn: 3600,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await symbolsApi.getUploadUrl("child-1", input);

      expect(result.data?.uploadUrl).toBe(mockResponse.uploadUrl);
      expect(result.data?.imageKey).toBe(mockResponse.imageKey);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/symbols/child-1/upload-url"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(input),
        })
      );
    });

    it("handles invalid content type", async () => {
      const input = {
        filename: "document.pdf",
        contentType: "application/pdf",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Invalid content type" }),
      });

      const result = await symbolsApi.getUploadUrl("child-1", input);

      expect(result.error).toBe("Invalid content type");
    });
  });

  describe("Error Handling", () => {
    it("handles malformed JSON response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const result = await symbolsApi.getCategories();

      expect(result.error).toBeTruthy();
    });

    it("handles timeout", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Timeout"));

      const result = await symbolsApi.getCategories();

      expect(result.error).toBe("Timeout");
    });

    it("handles server error (500)", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      const result = await symbolsApi.getCategories();

      expect(result.error).toBe("Internal server error");
    });
  });
});
