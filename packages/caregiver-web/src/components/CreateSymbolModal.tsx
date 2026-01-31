import { useState, useRef, ChangeEvent } from "react";
import { Button, Card } from "@flynn-aac/shared-ui";
import {
  symbolsApi,
  type SymbolCategory,
  type CreateCustomSymbolInput,
} from "~/lib/api";
import {
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface CreateSymbolModalProps {
  childId: string;
  categories: SymbolCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

type ImageSource = "upload" | "url" | "generate";
type Step = "basic-info" | "image-source" | "upload-image" | "url-image" | "generate-image" | "review";

export function CreateSymbolModal({
  childId,
  categories,
  onClose,
  onSuccess,
}: CreateSymbolModalProps) {
  const [step, setStep] = useState<Step>("basic-info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [nameBulgarian, setNameBulgarian] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageSource, setImageSource] = useState<ImageSource | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [uploadedImageKey, setUploadedImageKey] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation
  const isBasicInfoValid = name.trim() !== "" && categoryId !== "";
  const isImageUrlValid = imageUrl.trim() !== "" && imageUrl.startsWith("http");
  const isImagePromptValid = imagePrompt.trim().length >= 10;
  const isUploadComplete = uploadedImageKey !== "";

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Get presigned upload URL
      const urlResponse = await symbolsApi.getUploadUrl(childId, {
        filename: file.name,
        contentType: file.type,
      });

      if (urlResponse.error || !urlResponse.data) {
        throw new Error(urlResponse.error || "Failed to get upload URL");
      }

      const { uploadUrl, imageKey, publicUrl } = urlResponse.data;

      // Upload to R2
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadedImageKey(imageKey);
          setImageUrl(publicUrl);
          setUploadProgress(100);
          setIsUploading(false);
        } else {
          throw new Error("Upload failed");
        }
      });

      xhr.addEventListener("error", () => {
        throw new Error("Upload failed");
      });

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleSubmit() {
    if (!isBasicInfoValid) {
      setError("Please fill in all required fields");
      return;
    }

    if (!imageSource) {
      setError("Please select an image source");
      return;
    }

    if (imageSource === "upload" && !isUploadComplete) {
      setError("Please upload an image");
      return;
    }

    if (imageSource === "url" && !isImageUrlValid) {
      setError("Please enter a valid image URL");
      return;
    }

    if (imageSource === "generate" && !isImagePromptValid) {
      setError("Please enter a detailed image prompt (at least 10 characters)");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: CreateCustomSymbolInput = {
        childId,
        name: name.trim(),
        nameBulgarian: nameBulgarian.trim() || undefined,
        categoryId,
        imageSource,
        imageUrl: imageSource === "url" ? imageUrl : imageSource === "upload" ? imageUrl : undefined,
        imagePrompt: imageSource === "generate" ? imagePrompt : undefined,
        imageKey: imageSource === "upload" ? uploadedImageKey : undefined,
      };

      const response = await symbolsApi.createCustomSymbol(input);

      if (response.error) {
        throw new Error(response.error);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create symbol");
      setIsSubmitting(false);
    }
  }

  function renderStepContent() {
    switch (step) {
      case "basic-info":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Symbol Name (English) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ice Cream"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Symbol Name (Bulgarian)
              </label>
              <input
                type="text"
                value={nameBulgarian}
                onChange={(e) => setNameBulgarian(e.target.value)}
                placeholder="e.g., Сладолед"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      categoryId === category.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.colorHex }}
                      />
                      <div>
                        <div className="font-medium text-sm">{category.name}</div>
                        {category.nameBulgarian && (
                          <div className="text-xs text-gray-500">{category.nameBulgarian}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => setStep("image-source")}
                disabled={!isBasicInfoValid}
                className="flex-1"
              >
                Next: Choose Image
              </Button>
            </div>
          </div>
        );

      case "image-source":
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">How would you like to add an image for this symbol?</p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setImageSource("upload");
                  setStep("upload-image");
                }}
                className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <Upload className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Upload Image</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Upload a photo or image from your device
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImageSource("url");
                  setStep("url-image");
                }}
                className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">Image from URL</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Use an image from the internet by providing its URL
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImageSource("generate");
                  setStep("generate-image");
                }}
                className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-gray-900">AI Generated Image</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Describe the image and let AI generate it for you
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("basic-info")} className="flex-1">
                Back
              </Button>
            </div>
          </div>
        );

      case "upload-image":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>

              {/* Drag & Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                {isUploading ? (
                  <div className="space-y-3">
                    <Loader2 className="w-12 h-12 text-primary-600 mx-auto animate-spin" />
                    <div className="text-sm font-medium text-gray-700">Uploading...</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">{uploadProgress}%</div>
                  </div>
                ) : isUploadComplete ? (
                  <div className="space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                    <div className="text-sm font-medium text-gray-700">Image uploaded successfully!</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImageKey("");
                        setImageUrl("");
                        setUploadProgress(0);
                      }}
                    >
                      Upload Different Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div className="text-sm font-medium text-gray-700">
                      Click to upload or drag and drop
                    </div>
                    <div className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 5MB
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("image-source")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={!isUploadComplete}
                className="flex-1"
              >
                Review & Create
              </Button>
            </div>
          </div>
        );

      case "url-image":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the complete URL of an image (must start with http:// or https://)
              </p>
            </div>

            {/* Image Preview */}
            {isImageUrlValid && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-48 object-contain bg-gray-50"
                    onError={() => setError("Failed to load image from URL")}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("image-source")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={!isImageUrlValid}
                className="flex-1"
              >
                Review & Create
              </Button>
            </div>
          </div>
        );

      case "generate-image":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to generate... e.g., 'A colorful ice cream cone with chocolate and vanilla scoops'"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide a detailed description (at least 10 characters)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">AI Image Generation</p>
                  <p>
                    The image will be generated using AI based on your description. This may take a few moments.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep("image-source")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={!isImagePromptValid}
                className="flex-1"
              >
                Review & Create
              </Button>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-700 mb-4">Review your symbol:</div>

            {/* Symbol Preview */}
            <div className="border rounded-lg p-4">
              <div
                className="w-full h-48 rounded-lg flex items-center justify-center mb-3"
                style={{
                  backgroundColor: selectedCategory?.colorHex
                    ? `${selectedCategory.colorHex}20`
                    : "#f0f0f0",
                }}
              >
                {imageSource === "upload" || imageSource === "url" ? (
                  imageUrl ? (
                    <img src={imageUrl} alt={name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                  )
                ) : (
                  <div className="text-center p-4">
                    <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">AI will generate this image</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <div className="font-semibold text-lg">{name}</div>
                  {nameBulgarian && <div className="text-gray-600">{nameBulgarian}</div>}
                </div>

                {selectedCategory && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedCategory.colorHex }}
                    />
                    <span className="text-sm text-gray-600">{selectedCategory.name}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500 pt-2 border-t">
                  Image source:{" "}
                  {imageSource === "upload"
                    ? "Uploaded"
                    : imageSource === "url"
                    ? "URL"
                    : "AI Generated"}
                </div>

                {imageSource === "generate" && imagePrompt && (
                  <div className="text-xs text-gray-500">
                    Prompt: {imagePrompt}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (imageSource === "upload") setStep("upload-image");
                  else if (imageSource === "url") setStep("url-image");
                  else if (imageSource === "generate") setStep("generate-image");
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
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
          </div>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Create New Symbol</h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {step === "basic-info" ? 1 : step === "image-source" ? 2 : step === "review" ? 4 : 3} of 4
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step Content */}
          {renderStepContent()}
        </div>
      </Card>
    </div>
  );
}
