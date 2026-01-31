import { useState, useCallback, useRef } from "react";
import { Upload, Image as ImageIcon, Loader2, X, Check } from "lucide-react";
import { Button } from "@flynn-aac/shared-ui";

interface ImageUploadZoneProps {
  onUploadComplete: (imageUrl: string, imageKey: string) => void;
  categoryColor?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  testId?: string;
}

const DEFAULT_MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export function ImageUploadZone({
  onUploadComplete,
  categoryColor,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  disabled = false,
  testId = "image-upload-zone",
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return `Invalid file type. Please upload PNG or JPEG images.`;
      }

      // Check file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `File too large. Maximum size is ${maxSizeMB}MB.`;
      }

      return null;
    },
    [maxSizeMB]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsSuccess(false);

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Simulate upload process (will be replaced with real R2 upload)
      setIsUploading(true);
      setUploadProgress(0);

      try {
        // TODO: Replace with actual R2 presigned URL upload
        // For now, simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        clearInterval(progressInterval);

        setUploadProgress(100);

        // Mock successful upload response
        const mockImageKey = `custom-symbols/mock/${Date.now()}-${file.name}`;
        const mockImageUrl = `https://placeholder-cdn.com/${mockImageKey}`;

        setIsSuccess(true);
        onUploadComplete(mockImageUrl, mockImageKey);
      } catch (err) {
        console.error("Upload failed:", err);
        setError("Failed to upload image. Please try again.");
        setPreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [validateFile, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setIsSuccess(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div data-testid={testId} className="space-y-2">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8
          transition-all duration-200
          ${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${preview ? "aspect-square" : "aspect-video"}
          ${error ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload image"
        aria-disabled={disabled}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          data-testid={`${testId}-input`}
        />

        {preview ? (
          <div className="relative w-full h-full">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain rounded-lg"
              style={
                categoryColor
                  ? {
                      backgroundColor: `${categoryColor}20`,
                      borderColor: categoryColor,
                      borderWidth: 4,
                    }
                  : {}
              }
              data-testid={`${testId}-preview`}
            />

            {/* Upload progress overlay */}
            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
                <Loader2 className="w-10 h-10 animate-spin text-white mb-3" />
                <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                    data-testid={`${testId}-progress`}
                  />
                </div>
                <span className="text-white text-sm mt-2">{uploadProgress}%</span>
              </div>
            )}

            {/* Success checkmark */}
            {isSuccess && !isUploading && (
              <div
                className="absolute top-4 right-4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"
                data-testid={`${testId}-success`}
              >
                <Check className="w-6 h-6 text-white" />
              </div>
            )}

            {/* Remove button */}
            {!isUploading && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-4 left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                data-testid={`${testId}-remove`}
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 h-full">
            <Upload
              className={`w-12 h-12 ${error ? "text-red-500" : "text-muted-foreground"}`}
            />
            <div className="text-center">
              <p className={`font-medium ${error ? "text-red-600 dark:text-red-400" : ""}`}>
                {isDragging
                  ? "Drop image here"
                  : error
                    ? error
                    : "Drop image here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PNG, JPG up to {maxSizeMB}MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              data-testid={`${testId}-browse`}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Choose Photo
            </Button>
          </div>
        )}
      </div>

      {/* Error message below */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" data-testid={`${testId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
