import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { env } from "../config/env";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string | undefined;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(err: Error, c: Context): Response {
  // Log error in non-test environments
  if (env.NODE_ENV !== "test") {
    console.error("Error:", err);
  }

  // Handle known HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        code: "HTTP_ERROR",
      },
      err.status
    );
  }

  // Handle our custom app errors
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.message,
        code: err.code ?? "APP_ERROR",
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500
    );
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return c.json(
      {
        error: "Validation Error",
        code: "VALIDATION_ERROR",
        details: err,
      },
      400
    );
  }

  // Generic error
  return c.json(
    {
      error: env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
      code: "INTERNAL_ERROR",
    },
    500
  );
}
