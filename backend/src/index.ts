import { app } from "./app";
import { env } from "./config/env";

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`🚀 Flynn AAC Backend running on http://localhost:${server.port}`);
