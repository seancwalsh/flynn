/**
 * Storage Service for Image Uploads
 *
 * Provides presigned URLs for direct browser uploads to Cloudflare R2.
 * Uses AWS S3-compatible API for R2 interaction.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface PresignedUploadUrl {
  uploadUrl: string;
  imageKey: string;
  publicUrl: string;
  expiresIn: number;
}

export interface UploadOptions {
  childId: string;
  contentType: string;
  maxSizeBytes?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_EXPIRATION = 3600; // 1 hour
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// ============================================================================
// S3 Client Setup
// ============================================================================

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  // Check if R2 credentials are configured
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 storage not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables."
    );
  }

  // Create S3 client pointing to Cloudflare R2
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return s3Client;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique, safe file key for storage
 */
function generateFileKey(childId: string, extension: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  return `custom-symbols/${childId}/${timestamp}-${random}.${extension}`;
}

/**
 * Extract file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[contentType] || "jpg";
}

/**
 * Validate upload options
 */
function validateUploadOptions(options: UploadOptions): void {
  if (!ALLOWED_CONTENT_TYPES.includes(options.contentType)) {
    throw new Error(
      `Invalid content type: ${options.contentType}. Allowed types: ${ALLOWED_CONTENT_TYPES.join(", ")}`
    );
  }

  const maxSize = options.maxSizeBytes || MAX_FILE_SIZE;
  if (maxSize > MAX_FILE_SIZE) {
    throw new Error(`Max file size cannot exceed ${MAX_FILE_SIZE} bytes`);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a presigned URL for direct browser upload to R2
 *
 * @param options - Upload configuration
 * @returns Presigned upload URL and image metadata
 */
export async function generatePresignedUploadUrl(
  options: UploadOptions
): Promise<PresignedUploadUrl> {
  validateUploadOptions(options);

  const client = getS3Client();
  const extension = getExtensionFromContentType(options.contentType);
  const imageKey = generateFileKey(options.childId, extension);

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: imageKey,
    ContentType: options.contentType,
    ContentLength: options.maxSizeBytes || MAX_FILE_SIZE,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: DEFAULT_EXPIRATION,
  });

  // Construct public URL
  // If R2_PUBLIC_URL is set, use it; otherwise construct from account ID
  const publicUrl = env.R2_PUBLIC_URL
    ? `${env.R2_PUBLIC_URL}/${imageKey}`
    : `https://pub-${env.R2_ACCOUNT_ID}.r2.dev/${imageKey}`;

  return {
    uploadUrl,
    imageKey,
    publicUrl,
    expiresIn: DEFAULT_EXPIRATION,
  };
}

/**
 * Delete an image from R2 storage
 *
 * @param imageKey - The storage key of the image to delete
 */
export async function deleteImage(imageKey: string): Promise<void> {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: imageKey,
  });

  await client.send(command);
}

/**
 * Check if R2 storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY
  );
}

/**
 * Get storage configuration status for debugging
 */
export function getStorageStatus() {
  return {
    configured: isStorageConfigured(),
    bucketName: env.R2_BUCKET_NAME,
    hasAccountId: !!env.R2_ACCOUNT_ID,
    hasAccessKey: !!env.R2_ACCESS_KEY_ID,
    hasSecretKey: !!env.R2_SECRET_ACCESS_KEY,
    hasPublicUrl: !!env.R2_PUBLIC_URL,
  };
}
