import { Check } from "lucide-react";

export interface Category {
  id: string;
  name: string;
  nameBulgarian?: string | null;
  colorName: string;
  colorHex: string;
  icon?: string | null;
  displayOrder: number;
}

interface CategoryGridProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  previewImage?: string | null;
  disabled?: boolean;
  testId?: string;
}

export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  previewImage,
  disabled = false,
  testId = "category-grid",
}: CategoryGridProps) {
  return (
    <div data-testid={testId} className="space-y-3">
      <label className="text-sm font-medium block">Category</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((category) => {
          const isSelected = selectedId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => !disabled && onSelect(category)}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95 cursor-pointer"}
                ${
                  isSelected
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "border-muted hover:border-muted-foreground/50"
                }
              `}
              style={
                isSelected
                  ? {
                      backgroundColor: `${category.colorHex}10`,
                      borderColor: category.colorHex,
                    }
                  : {}
              }
              data-testid={`${testId}-category-${category.id}`}
              aria-pressed={isSelected}
              aria-label={`Select ${category.name} category`}
            >
              {/* Check badge */}
              {isSelected && (
                <div
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: category.colorHex }}
                  data-testid={`${testId}-checkmark-${category.id}`}
                >
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              )}

              {/* Category color swatch */}
              <div
                className="w-12 h-12 rounded-lg mb-3 mx-auto transition-transform duration-200"
                style={{ backgroundColor: category.colorHex }}
                data-testid={`${testId}-swatch-${category.id}`}
              />

              {/* Category name */}
              <div className="space-y-1">
                <p
                  className="font-medium text-sm text-center leading-tight"
                  data-testid={`${testId}-name-${category.id}`}
                >
                  {category.name}
                </p>
                {category.nameBulgarian && (
                  <p
                    className="text-xs text-muted-foreground text-center"
                    data-testid={`${testId}-name-bulgarian-${category.id}`}
                  >
                    {category.nameBulgarian}
                  </p>
                )}
              </div>

              {/* Live preview with this category color */}
              {isSelected && previewImage && (
                <div className="mt-3 pt-3 border-t border-muted/50">
                  <p className="text-xs text-muted-foreground mb-2 text-center">Preview:</p>
                  <div
                    className="w-16 h-16 mx-auto rounded-lg p-2 border-2 transition-all duration-300"
                    style={{
                      backgroundColor: `${category.colorHex}20`,
                      borderColor: category.colorHex,
                    }}
                    data-testid={`${testId}-preview-${category.id}`}
                  >
                    <img
                      src={previewImage}
                      alt="Symbol preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8" data-testid={`${testId}-empty`}>
          No categories available
        </p>
      )}
    </div>
  );
}
