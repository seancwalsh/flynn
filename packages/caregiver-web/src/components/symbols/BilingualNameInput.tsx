import { useState, useEffect, useCallback } from "react";
import { Input, Button } from "@flynn-aac/shared-ui";
import { Languages, Loader2, CheckCircle2 } from "lucide-react";

interface BilingualNameInputProps {
  nameEn: string;
  nameBg: string;
  onChangeEn: (value: string) => void;
  onChangeBg: (value: string) => void;
  disabled?: boolean;
  autoTranslate?: boolean;
  testId?: string;
}

// Mock translation function (will be replaced with real API)
async function translateText(text: string, from: string, to: string): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Mock simple translations for common words (for testing)
  const mockTranslations: Record<string, string> = {
    pizza: "пица",
    hello: "здравей",
    goodbye: "довиждане",
    thank: "благодаря",
    please: "моля",
    water: "вода",
    food: "храна",
    home: "дом",
    yes: "да",
    no: "не",
  };

  const lowerText = text.toLowerCase().trim();
  return mockTranslations[lowerText] || text; // Fallback to original if no translation
}

export function BilingualNameInput({
  nameEn,
  nameBg,
  onChangeEn,
  onChangeBg,
  disabled = false,
  autoTranslate = true,
  testId = "bilingual-input",
}: BilingualNameInputProps) {
  const [bgSuggestion, setBgSuggestion] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Auto-suggest Bulgarian translation
  useEffect(() => {
    if (!autoTranslate || !nameEn || nameEn.length < 2) {
      setBgSuggestion("");
      setShowSuggestion(false);
      return;
    }

    // Don't suggest if user already has Bulgarian text
    if (nameBg) {
      setShowSuggestion(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsTranslating(true);
      try {
        const translation = await translateText(nameEn, "en", "bg");
        if (translation !== nameEn) {
          // Only show suggestion if we got an actual translation
          setBgSuggestion(translation);
          setShowSuggestion(true);
        } else {
          setBgSuggestion("");
          setShowSuggestion(false);
        }
      } catch (error) {
        console.error("Translation failed:", error);
        setBgSuggestion("");
        setShowSuggestion(false);
      } finally {
        setIsTranslating(false);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [nameEn, nameBg, autoTranslate]);

  const handleUseSuggestion = useCallback(() => {
    if (bgSuggestion) {
      onChangeBg(bgSuggestion);
      setShowSuggestion(false);
    }
  }, [bgSuggestion, onChangeBg]);

  const handleEnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChangeEn(e.target.value);
    },
    [onChangeEn]
  );

  const handleBgChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChangeBg(e.target.value);
      if (e.target.value) {
        setShowSuggestion(false); // Hide suggestion once user starts typing
      }
    },
    [onChangeBg]
  );

  return (
    <div className="space-y-4" data-testid={testId}>
      {/* English name */}
      <div>
        <label
          htmlFor={`${testId}-en`}
          className="text-sm font-medium block mb-2"
        >
          Symbol Name (English)
        </label>
        <Input
          id={`${testId}-en`}
          value={nameEn}
          onChange={handleEnChange}
          placeholder="e.g., Pizza"
          maxLength={100}
          disabled={disabled}
          data-testid={`${testId}-en-input`}
          aria-label="English symbol name"
        />
      </div>

      {/* Bulgarian name with suggestion */}
      <div>
        <label
          htmlFor={`${testId}-bg`}
          className="text-sm font-medium block mb-2 flex items-center gap-2"
        >
          Име (Bulgarian)
          {isTranslating && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Translating...
            </span>
          )}
        </label>
        <div className="relative">
          <Input
            id={`${testId}-bg`}
            value={nameBg}
            onChange={handleBgChange}
            placeholder={bgSuggestion || "e.g., Пица"}
            maxLength={100}
            disabled={disabled}
            data-testid={`${testId}-bg-input`}
            aria-label="Bulgarian symbol name"
            className={showSuggestion ? "pr-32" : ""}
          />

          {/* Use suggestion button */}
          {showSuggestion && !nameBg && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              onClick={handleUseSuggestion}
              disabled={disabled}
              data-testid={`${testId}-use-suggestion`}
            >
              <Languages className="w-3 h-3 mr-1" />
              Use suggestion
            </Button>
          )}
        </div>

        {/* Suggestion hint */}
        {showSuggestion && !nameBg && bgSuggestion && (
          <div
            className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted/50"
            data-testid={`${testId}-suggestion-hint`}
          >
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Suggested: <span className="font-medium text-foreground">{bgSuggestion}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
