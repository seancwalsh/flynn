import type { Context, Next } from "hono";
import { env } from "../config/env";

export const logger = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    if (env.NODE_ENV !== "test") {
      const emoji = status >= 400 ? "❌" : status >= 300 ? "↪️" : "✅";
      console.log(`${emoji} ${method} ${path} ${status} ${duration}ms`);
    }
  };
};
