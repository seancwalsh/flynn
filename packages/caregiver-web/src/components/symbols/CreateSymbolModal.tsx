import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@flynn-aac/shared-ui";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { ImageUploadZone } from "./ImageUploadZone";
import { CategoryGrid, type Category } from "./CategoryGrid";
import { BilingualNameInput } from "./BilingualNameInput";
import { symbolsApi, type CreateCustomSymbolInput } from "~/lib/api";

interface CreateSymbolModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  onSuccess?: (symbolId: string) => void;
  testId?: string;
}

export function CreateSymbolModal({
  isOpen,
  onClose,
  childId,
  onSuccess,
  testId = "create-symbol-modal",
}: CreateSymbolModalProps) {
  // Form state
  const [nameEn, setNameEn] = useState("");
  const [nameBg, setNameBg] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load categories on mount
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        resetForm();
      }, 300); // Wait for modal close animation
    }
  }, [isOpen]);

  async function loadCategories() {
    setIsLoadingCategories(true);
    setError(null);

    try {
      const response = await symbolsApi.getCategories();

      if (response.error) {
        setError(`Failed to load categories: ${response.error}`);
        return;
      }

      if (response.data?.data) {
        setCategories(response.data.data);
      }
    } catch (err) {
      setError("Failed to load categories");
      console.error("Error loading categories:", err);
    } finally {
      setIsLoadingCategories(false);
    }
  }

  function resetForm() {
    setNameEn("");
    setNameBg("");
    setSelectedCategory(null);
    setImageUrl(null);
    setImageKey(null);
    setPreviewImage(null);
    setError(null);
    setSuccess(false);
  }

  function handleImageUpload(url: string, key: string) {
    setImageUrl(url);
    setImageKey(key);
    setPreviewImage(url);
    setError(null);
  }

  function handleCategorySelect(category: Category) {
    setSelectedCategory(category);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!nameEn.trim()) {
      setError("English name is required");
      return;
    }

    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }

    if (!imageKey) {
      setError("Please upload an image");
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateCustomSymbolInput = {
        childId,
        name: nameEn.trim(),
        nameBulgarian: nameBg.trim() || undefined,
        categoryId: selectedCategory.id,
        imageSource: "upload",
        imageKey,
        imageUrl: imageUrl || undefined,
      };

      const response = await symbolsApi.createCustomSymbol(input);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data?.data) {
        setSuccess(true);

        // Show success message briefly before closing
        setTimeout(() => {
          onSuccess?.(response.data.data.id);
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create symbol");
      console.error("Error creating symbol:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormValid = nameEn.trim() && selectedCategory && imageKey;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="liquid-glass-navigation max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Create Custom Symbol</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid={`${testId}-close`}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div
            className="flex flex-col items-center justify-center py-12"
            data-testid={`${testId}-success`}
          >
            <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Symbol Created!</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your custom symbol "{nameEn}" has been submitted for approval.
              <br />
              It will appear in the app once a therapist reviews it.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" data-testid={`${testId}-form`}>
            {/* Name inputs */}
            <BilingualNameInput
              nameEn={nameEn}
              nameBg={nameBg}
              onChangeEn={setNameEn}
              onChangeBg={setNameBg}
              disabled={isSubmitting}
              testId={`${testId}-name-input`}
            />

            {/* Category selection */}
            {isLoadingCategories ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
              </div>
            ) : (
              <CategoryGrid
                categories={categories}
                selectedId={selectedCategory?.id || null}
                onSelect={handleCategorySelect}
                previewImage={previewImage}
                disabled={isSubmitting}
                testId={`${testId}-category-grid`}
              />
            )}

            {/* Image upload */}
            <ImageUploadZone
              onUploadComplete={handleImageUpload}
              categoryColor={selectedCategory?.colorHex}
              disabled={isSubmitting}
              testId={`${testId}-image-upload`}
            />

            {/* Error message */}
            {error && (
              <div
                className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                data-testid={`${testId}-error`}
              >
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
                data-testid={`${testId}-cancel`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="flex-1 liquid-glass-navigation"
                data-testid={`${testId}-submit`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Symbol"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
