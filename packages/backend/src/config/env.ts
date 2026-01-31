import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5434/flynn_aac"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  
  // Clerk Authentication
  CLERK_SECRET_KEY: z.string().optional(), // Required for auth - sk_test_... or sk_live_...
  CLERK_PUBLISHABLE_KEY: z.string().optional(), // For reference - pk_test_... or pk_live_...
  CLERK_WEBHOOK_SECRET: z.string().optional(), // Required in production for webhook verification
  
  // Anthropic API
  ANTHROPIC_API_KEY: z.string().optional(),

  // Cloudflare R2 Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("flynn-aac-symbols"),
  R2_PUBLIC_URL: z.string().optional(), // Public URL for uploaded images
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
