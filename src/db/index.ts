import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import * as schema from "./schema";

// Connection for queries
const queryClient = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle ORM instance
export const db = drizzle(queryClient, { schema });

// Database status check
export async function getDbStatus(): Promise<{ connected: boolean; message: string }> {
  try {
    await queryClient`SELECT 1`;
    return { connected: true, message: "Connected" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { connected: false, message };
  }
}

// Graceful shutdown
export async function closeDb(): Promise<void> {
  await queryClient.end();
}

// Export schema for convenience
export * from "./schema";
