# Custom Symbol Creation - UX Enhancement Plan

## Philosophy: From "Works" to "Loved"

The functional implementation (21 hours) gets the feature working. These enhancements (12-15 hours) make it delightful to use.

**Goal:** Make custom symbol creation feel like a magical, personal moment where caregivers create something unique for their child.

---

## 🎨 Track 1: Visual Design & Liquid Glass

### 1.1 Liquid Glass Throughout Web UI

**Affected Components:**
- CreateSymbolModal (caregiver-web)
- CategoryPicker
- ImagePreview cards
- Approval queue (therapist-web)

**Implementation:**

```tsx
// packages/caregiver-web/src/components/symbols/CreateSymbolModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@flynn-aac/shared-ui";

export function CreateSymbolModal({ childId, isOpen, onClose }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="liquid-glass-navigation">
        {/* Navigation layer gets glass effect */}
        <DialogHeader>
          <DialogTitle>Create Custom Symbol</DialogTitle>
        </DialogHeader>

        {/* Content layer stays solid */}
        <form className="space-y-6">
          <ImageSourceSelector />
          <CategoryGrid />
          <BilinguaNameInput />

          {/* Action buttons with glass */}
          <div className="flex gap-3 liquid-glass-navigation">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="relative">
              Create Symbol
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**CSS Addition to shared-ui:**

```css
/* packages/shared-ui/src/styles/liquid-glass.css */
.liquid-glass-navigation {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  .liquid-glass-navigation {
    background: rgba(30, 30, 30, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.liquid-glass-content {
  /* Content layers stay solid - no glass-on-glass */
  background: white;
}

@media (prefers-color-scheme: dark) {
  .liquid-glass-content {
    background: rgb(20, 20, 20);
  }
}
```

**Time:** 2 hours

---

### 1.2 iOS Liquid Glass + SF Symbols Animations

**Implementation:**

```swift
// aac-ios/FlynnAAC/Views/Symbols/CreateSymbolButton.swift (NEW)
import SwiftUI

struct CreateSymbolButton: View {
    @State private var isPressed = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label("Add Custom Symbol", systemImage: "plus.square.on.square")
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity)
                .frame(height: 54)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .symbolEffect(.pulse, options: .repeating, isActive: !isPressed)
        .sensoryFeedback(.selection, trigger: isPressed)
        .containerRelativeShape()
        .glassEffect()  // Uses axiom-liquid-glass patterns
        .onTapGesture {
            isPressed.toggle()
        }
    }
}

// Extension for glass effect (following Apple patterns)
extension View {
    func glassEffect() -> some View {
        self
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(.white.opacity(0.2), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.1), radius: 10, y: 4)
    }
}
```

**Celebration Animation on Approval:**

```swift
// aac-ios/FlynnAAC/Views/SymbolGrid/SymbolCell.swift
struct SymbolCell: View {
    let symbol: Symbol
    @State private var showConfetti = false
    @State private var scale: CGFloat = 0.8
    @State private var opacity: Double = 0.0

    var body: some View {
        ZStack {
            symbolContent

            if symbol.isCustom && symbol.justApproved {
                ConfettiView()
                    .opacity(showConfetti ? 1 : 0)
            }
        }
        .onAppear {
            if symbol.isCustom && symbol.justApproved {
                animateApproval()
            }
        }
    }

    private func animateApproval() {
        withAnimation(.spring(duration: 0.6, bounce: 0.4)) {
            scale = 1.0
            opacity = 1.0
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            withAnimation(.easeIn(duration: 0.3)) {
                showConfetti = true
            }

            // Haptic feedback
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
        }

        // Clear flag after animation
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            symbol.markAsShown()
        }
    }
}
```

**Time:** 3 hours

---

## 📸 Track 2: Image Upload Infrastructure

### 2.1 Cloudflare R2 Storage Setup

**Backend Configuration:**

```typescript
// packages/backend/src/config/storage.ts (NEW)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://[account-id].r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadCustomSymbolImage(
  file: File,
  childId: string
): Promise<string> {
  const key = `custom-symbols/${childId}/${Date.now()}-${file.name}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: file.type,
      Metadata: {
        childId,
        uploadedAt: new Date().toISOString(),
      },
    })
  );

  // Return public URL
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function getUploadPresignedUrl(
  childId: string,
  filename: string
): Promise<{ url: string; key: string }> {
  const key = `custom-symbols/${childId}/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: "image/*",
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { url, key };
}
```

**Environment Variables:**

```bash
# .env.example additions
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=flynn-aac-symbols
R2_PUBLIC_URL=https://symbols.flynn-aac.com
```

**Time:** 2 hours

---

### 2.2 Backend Upload Endpoint

```typescript
// packages/backend/src/routes/api/v1/symbols.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import sharp from "sharp";

const symbolsRoutes = new Hono();

// Presigned URL approach (recommended - client uploads directly to R2)
symbolsRoutes.post(
  "/:childId/upload-url",
  requireChildAccess(),
  zValidator(
    "json",
    z.object({
      filename: z.string(),
      contentType: z.string().regex(/^image\/(png|jpeg|jpg)$/),
    })
  ),
  async (c) => {
    const { childId } = c.req.param();
    const { filename } = c.req.valid("json");

    const { url, key } = await getUploadPresignedUrl(childId, filename);

    return c.json({
      uploadUrl: url,
      imageKey: key,
      expiresIn: 3600,
    });
  }
);

// Alternative: Direct upload (if needed)
symbolsRoutes.post(
  "/:childId/upload-image",
  requireChildAccess(),
  async (c) => {
    const { childId } = c.req.param();
    const formData = await c.req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return c.json({ error: "No image provided" }, 400);
    }

    // Validate image
    const buffer = await file.arrayBuffer();
    const image = sharp(Buffer.from(buffer));
    const metadata = await image.metadata();

    // Validate dimensions and size
    if (!metadata.width || !metadata.height) {
      return c.json({ error: "Invalid image" }, 400);
    }

    if (metadata.width > 2000 || metadata.height > 2000) {
      return c.json({ error: "Image too large (max 2000x2000)" }, 400);
    }

    if (buffer.byteLength > 5 * 1024 * 1024) {
      return c.json({ error: "File too large (max 5MB)" }, 400);
    }

    // Resize to square and optimize
    const optimized = await image
      .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ quality: 90 })
      .toBuffer();

    // Upload to R2
    const imageUrl = await uploadCustomSymbolImage(
      new File([optimized], file.name, { type: "image/png" }),
      childId
    );

    return c.json({ imageUrl });
  }
);
```

**Dependencies to add:**

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp
```

**Time:** 3 hours

---

### 2.3 Frontend Photo Picker with Drag-Drop

```tsx
// packages/caregiver-web/src/components/symbols/ImageUploadZone.tsx (NEW)
import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@flynn-aac/shared-ui";
import { symbolsApi } from "~/lib/api";

interface ImageUploadZoneProps {
  childId: string;
  onUploadComplete: (imageUrl: string) => void;
  categoryColor?: string;
}

export function ImageUploadZone({ childId, onUploadComplete, categoryColor }: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload in background
    setIsUploading(true);
    try {
      // Get presigned URL
      const { uploadUrl, imageKey } = await symbolsApi.getUploadUrl(childId, {
        filename: file.name,
        contentType: file.type,
      });

      // Upload directly to R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // Construct public URL
      const imageUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${imageKey}`;

      onUploadComplete(imageUrl);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }, [childId, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8
        transition-all duration-200
        ${isDragging ? "border-primary bg-primary/5" : "border-muted"}
        ${preview ? "aspect-square" : "aspect-video"}
      `}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      {preview ? (
        <div className="relative w-full h-full">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-contain rounded"
            style={categoryColor ? {
              backgroundColor: categoryColor + "20",
              borderColor: categoryColor,
              borderWidth: 4,
            } : {}}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <span className="ml-2 text-white">Uploading...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 h-full">
          <Upload className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Drop image here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              PNG, JPG up to 5MB
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Choose Photo
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Time:** 3 hours

---

## 🎨 Track 3: Visual Category Selection

### 3.1 Category Grid with Live Preview

```tsx
// packages/caregiver-web/src/components/symbols/CategoryGrid.tsx (NEW)
import { useState } from "react";
import { Check } from "lucide-react";

interface Category {
  id: string;
  name: string;
  colorName: string;
  colorHex: string;
  icon: string;
  exampleSymbols: string[]; // URLs of example symbols
}

interface CategoryGridProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  previewImage?: string | null;
}

export function CategoryGrid({ categories, selectedId, onSelect, previewImage }: CategoryGridProps) {
  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">Category</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((category) => {
          const isSelected = selectedId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category)}
              className={`
                relative p-4 rounded-xl border-2 transition-all
                hover:scale-105 active:scale-95
                ${isSelected
                  ? "border-primary shadow-lg"
                  : "border-muted hover:border-muted-foreground/50"
                }
              `}
              style={isSelected ? {
                backgroundColor: category.colorHex + "10",
                borderColor: category.colorHex,
              } : {}}
            >
              {/* Check badge */}
              {isSelected && (
                <div
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: category.colorHex }}
                >
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Category color swatch */}
              <div
                className="w-12 h-12 rounded-lg mb-3 mx-auto"
                style={{ backgroundColor: category.colorHex }}
              />

              {/* Category name */}
              <p className="font-medium text-sm text-center mb-2">
                {category.name}
              </p>

              {/* Example symbols */}
              <div className="flex gap-1 justify-center">
                {category.exampleSymbols.slice(0, 3).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-6 h-6 object-contain opacity-60"
                  />
                ))}
              </div>

              {/* Live preview with this category color */}
              {isSelected && previewImage && (
                <div className="mt-3 pt-3 border-t border-muted">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div
                    className="w-16 h-16 mx-auto rounded-lg p-2 border-2"
                    style={{
                      backgroundColor: category.colorHex + "20",
                      borderColor: category.colorHex,
                    }}
                  >
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Time:** 2 hours

---

## 🌍 Track 4: Smart Bilingual Input

### 4.1 Translation Suggestions

```tsx
// packages/caregiver-web/src/components/symbols/BilingualNameInput.tsx (NEW)
import { useState, useEffect } from "react";
import { Input, Button } from "@flynn-aac/shared-ui";
import { Languages, Loader2 } from "lucide-react";

interface BilingualNameInputProps {
  nameEn: string;
  nameBg: string;
  onChangeEn: (value: string) => void;
  onChangeBg: (value: string) => void;
}

export function BilingualNameInput({
  nameEn,
  nameBg,
  onChangeEn,
  onChangeBg
}: BilingualNameInputProps) {
  const [bgSuggestion, setBgSuggestion] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // Auto-suggest Bulgarian translation
  useEffect(() => {
    if (!nameEn || nameEn.length < 2) {
      setBgSuggestion("");
      return;
    }

    const timer = setTimeout(async () => {
      setIsTranslating(true);
      try {
        // Use browser's built-in translation API if available
        // Or fall back to backend translation service
        const response = await fetch(`/api/v1/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nameEn, from: "en", to: "bg" }),
        });

        const { translation } = await response.json();
        setBgSuggestion(translation);
      } catch (error) {
        console.error("Translation failed:", error);
      } finally {
        setIsTranslating(false);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [nameEn]);

  return (
    <div className="space-y-4">
      {/* English name */}
      <div>
        <label htmlFor="name-en" className="text-sm font-medium block mb-2">
          Symbol Name (English)
        </label>
        <Input
          id="name-en"
          value={nameEn}
          onChange={(e) => onChangeEn(e.target.value)}
          placeholder="e.g., Pizza"
          maxLength={100}
        />
      </div>

      {/* Bulgarian name with suggestion */}
      <div>
        <label htmlFor="name-bg" className="text-sm font-medium block mb-2 flex items-center gap-2">
          Име (Bulgarian)
          {isTranslating && <Loader2 className="w-3 h-3 animate-spin" />}
        </label>
        <div className="relative">
          <Input
            id="name-bg"
            value={nameBg}
            onChange={(e) => onChangeBg(e.target.value)}
            placeholder={bgSuggestion || "е.g., Пица"}
            maxLength={100}
          />

          {/* Use suggestion button */}
          {bgSuggestion && !nameBg && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => onChangeBg(bgSuggestion)}
            >
              <Languages className="w-4 h-4 mr-1" />
              Use suggestion
            </Button>
          )}
        </div>

        {bgSuggestion && !nameBg && (
          <p className="text-xs text-muted-foreground mt-1">
            Suggested: {bgSuggestion}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Backend Translation Endpoint:**

```typescript
// packages/backend/src/routes/api/v1/translate.ts (NEW)
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const translateRoutes = new Hono();

// Simple translation cache to avoid hitting API repeatedly
const translationCache = new Map<string, string>();

translateRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      text: z.string().max(200),
      from: z.enum(["en", "bg"]),
      to: z.enum(["en", "bg"]),
    })
  ),
  async (c) => {
    const { text, from, to } = c.req.valid("json");

    const cacheKey = `${from}:${to}:${text}`;
    if (translationCache.has(cacheKey)) {
      return c.json({ translation: translationCache.get(cacheKey) });
    }

    // Use Google Translate API or LibreTranslate
    // For now, simple placeholder
    // TODO: Integrate actual translation service
    const translation = text; // Placeholder

    translationCache.set(cacheKey, translation);

    return c.json({ translation });
  }
);

export default translateRoutes;
```

**Time:** 2 hours

---

## 👁️ Track 5: Live Preview in Grid

### 5.1 Pending Symbol in iOS Grid

```swift
// aac-ios/FlynnAAC/Views/SymbolGrid/SymbolCell.swift (UPDATE)
struct SymbolCell: View {
    let symbol: Symbol

    var body: some View {
        Button(action: { handleTap() }) {
            VStack(spacing: 8) {
                symbolImage
                    .overlay(alignment: .topTrailing) {
                        if symbol.status == .pending {
                            PendingBadge()
                        }
                    }

                Text(symbol.label)
                    .font(.caption)
                    .foregroundStyle(symbol.isPending ? .secondary : .primary)
            }
        }
        .opacity(symbol.isPending ? 0.6 : 1.0)
        .disabled(symbol.isPending)
    }
}

struct PendingBadge: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "clock.fill")
                .font(.caption2)
            Text("Pending")
                .font(.caption2)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .glassEffect()
    }
}
```

### 5.2 Pending Symbol in Web Grid

```tsx
// packages/caregiver-web/src/components/symbols/SymbolCell.tsx (UPDATE)
interface SymbolCellProps {
  symbol: Symbol;
  onClick?: () => void;
}

export function SymbolCell({ symbol, onClick }: SymbolCellProps) {
  const isPending = symbol.status === "pending";
  const isRejected = symbol.status === "rejected";

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className={`
        relative group p-4 rounded-xl border-2 transition-all
        ${isPending ? "opacity-60 cursor-not-allowed" : "hover:scale-105"}
        ${isRejected ? "border-red-500" : "border-muted"}
      `}
      style={symbol.categoryColor ? {
        backgroundColor: symbol.categoryColor + "10",
      } : {}}
    >
      {/* Image */}
      <div className="w-20 h-20 mx-auto mb-2 relative">
        <img
          src={symbol.imageUrl}
          alt={symbol.name}
          className="w-full h-full object-contain"
        />

        {/* Status badges */}
        {isPending && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </div>
        )}

        {isRejected && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <X className="w-3 h-3" />
            Rejected
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-center">{symbol.name}</p>
    </button>
  );
}
```

**Time:** 1.5 hours

---

## ✅ Track 6: Swipeable Approval Queue

### 6.1 Therapist Approval UI

```tsx
// packages/therapist-web/src/routes/_app/symbol-approvals.tsx (UPDATE)
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@flynn-aac/shared-ui";
import { Check, X, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

export function SymbolApprovalQueue() {
  const [pendingSymbols, setPendingSymbols] = useState<CustomSymbol[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const currentSymbol = pendingSymbols[currentIndex];

  const handleSwipe = (direction: "left" | "right", info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      if (direction === "right") {
        handleApprove(currentSymbol.id);
      } else {
        handleReject(currentSymbol.id);
      }

      setDirection(direction);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setDirection(null);
      }, 300);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Symbol Approval Queue
        <span className="text-sm text-muted-foreground ml-2">
          ({pendingSymbols.length} pending)
        </span>
      </h1>

      <div className="relative h-[500px]">
        <AnimatePresence>
          {currentSymbol && (
            <motion.div
              key={currentSymbol.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 100) handleSwipe("right", info);
                else if (info.offset.x < -100) handleSwipe("left", info);
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                x: direction === "right" ? 300 : -300,
                opacity: 0,
                transition: { duration: 0.3 }
              }}
              className="absolute inset-0"
            >
              <Card className="h-full liquid-glass-navigation">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{currentSymbol.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      for {currentSymbol.childName}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Symbol preview with category color */}
                  <div
                    className="w-40 h-40 mx-auto rounded-2xl p-4 border-4"
                    style={{
                      backgroundColor: currentSymbol.categoryColor + "20",
                      borderColor: currentSymbol.categoryColor,
                    }}
                  >
                    <img
                      src={currentSymbol.imageUrl}
                      alt={currentSymbol.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Symbol details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">English:</span>
                      <span className="font-medium">{currentSymbol.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bulgarian:</span>
                      <span className="font-medium">{currentSymbol.nameBulgarian}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{currentSymbol.categoryName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted:</span>
                      <span>{new Date(currentSymbol.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Child's existing symbols for context */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {currentSymbol.childName}'s existing symbols:
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                      {currentSymbol.existingSymbols.slice(0, 6).map((s) => (
                        <img
                          key={s.id}
                          src={s.imageUrl}
                          alt={s.name}
                          className="w-12 h-12 object-contain rounded border"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => handleReject(currentSymbol.id)}
                    >
                      <X className="w-5 h-5 mr-2" />
                      Reject
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowQuickEdit(true)}
                    >
                      <Edit2 className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="default"
                      size="lg"
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => handleApprove(currentSymbol.id)}
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

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
```

**Dependencies:**

```bash
bun add framer-motion
```

**Time:** 3 hours

---

## 🎉 Track 7: Celebration Moments

### 7.1 Push Notifications

```typescript
// packages/backend/src/services/notifications.ts (UPDATE)
import { db } from "../db";
import { customSymbols, users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function notifySymbolApproved(symbolId: string) {
  const symbol = await db.query.customSymbols.findFirst({
    where: eq(customSymbols.id, symbolId),
    with: {
      child: {
        with: {
          family: {
            with: {
              caregivers: true,
            },
          },
        },
      },
    },
  });

  if (!symbol) return;

  // Send push notification to all caregivers
  for (const caregiver of symbol.child.family.caregivers) {
    await sendPushNotification(caregiver.userId, {
      title: "Symbol Approved! 🎉",
      body: `Your symbol "${symbol.name}" is now available for ${symbol.child.firstName}`,
      data: {
        type: "symbol_approved",
        symbolId: symbol.id,
        childId: symbol.childId,
      },
    });
  }

  // Also trigger iOS sync
  await triggerIOSSync(symbol.childId);
}

async function sendPushNotification(userId: string, payload: any) {
  // Integrate with Firebase Cloud Messaging or APNs
  // This is a placeholder
  console.log(`📱 Push to user ${userId}:`, payload);
}
```

### 7.2 iOS Confetti Animation

```swift
// aac-ios/FlynnAAC/Views/Effects/ConfettiView.swift (NEW)
import SwiftUI

struct ConfettiView: View {
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            ForEach(0..<30, id: \.self) { i in
                ConfettiPiece(delay: Double(i) * 0.05)
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}

struct ConfettiPiece: View {
    let delay: Double
    @State private var yOffset: CGFloat = 0
    @State private var xOffset: CGFloat = 0
    @State private var rotation: Double = 0
    @State private var opacity: Double = 1

    let colors: [Color] = [.red, .blue, .green, .yellow, .purple, .orange]
    let color: Color

    init(delay: Double) {
        self.delay = delay
        self.color = colors.randomElement() ?? .blue
    }

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: 10, height: 10)
            .rotationEffect(.degrees(rotation))
            .offset(x: xOffset, y: yOffset)
            .opacity(opacity)
            .onAppear {
                withAnimation(
                    .easeOut(duration: 1.5)
                    .delay(delay)
                ) {
                    yOffset = 400
                    xOffset = CGFloat.random(in: -100...100)
                    rotation = Double.random(in: 0...720)
                    opacity = 0
                }
            }
    }
}
```

**Time:** 1 hour

---

## 📊 Summary Table

| Track | Feature | Time | Priority |
|-------|---------|------|----------|
| 1 | Liquid Glass (Web) | 2h | High |
| 1 | Liquid Glass + SF Animations (iOS) | 3h | High |
| 2 | Cloudflare R2 Setup | 2h | **Critical** |
| 2 | Backend Upload Endpoint | 3h | **Critical** |
| 2 | Frontend Photo Picker | 3h | **Critical** |
| 3 | Visual Category Grid | 2h | High |
| 4 | Smart Translation | 2h | Medium |
| 5 | Live Preview in Grid | 1.5h | High |
| 6 | Swipeable Approval Queue | 3h | Medium |
| 7 | Celebration Animations | 1h | Low |
| **TOTAL** | | **22.5h** | |

---

## Phased Rollout Recommendation

### Phase A: MVP with Beauty (Functional + Image Upload)
**Time:** ~28 hours (21h functional + 8h critical UX)
- ✅ All original functional features
- ✅ Image upload infrastructure (Track 2)
- ✅ Basic Liquid Glass polish (Track 1)
- ✅ Visual category grid (Track 3)

**Result:** Feature works AND looks modern

### Phase B: Delight Layer
**Time:** +14 hours
- ✅ Smart translation (Track 4)
- ✅ Live preview (Track 5)
- ✅ Swipeable approvals (Track 6)
- ✅ Celebrations (Track 7)

**Result:** Feature becomes loved

---

## Total Revised Estimate

- **Functional MVP:** 21 hours (original)
- **Image Upload (Critical):** +8 hours
- **UX Enhancements:** +14 hours
- **TOTAL:** 43 hours (~1 week for 1 developer)

**Recommendation:** Implement Phase A (28h) first, validate with users, then add Phase B (14h) based on feedback.

---

## Success Metrics

**Functional success:**
- ✅ Custom symbols created
- ✅ Approval workflow works
- ✅ Symbols sync to iOS

**Delight success:**
- 📊 Time to create symbol < 2 minutes
- 📊 Caregiver satisfaction score > 4.5/5
- 📊 Feature usage > 60% of families
- 📊 Re-submission rate < 10% (good UX reduces errors)

---

## Next Steps

1. **Review this plan** - Does this level of polish align with your vision?
2. **Prioritize tracks** - Which enhancements are must-haves vs nice-to-haves?
3. **Set up infrastructure** - Cloudflare R2 account, translation API
4. **Begin Phase A implementation** - Functional + critical UX
5. **User testing** - Get feedback before Phase B
6. **Polish** - Add remaining delight features

Would you like me to proceed with implementation, starting with Phase A (functional + image upload + basic polish)?
