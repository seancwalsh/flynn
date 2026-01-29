import { app } from "./app";
import { env } from "./config/env";

const server = Bun.serve({
  port: env.PORT,
  hostname: "0.0.0.0", // Listen on all network interfaces for mobile testing
  fetch: app.fetch,
});

console.log(`🚀 Flynn AAC Backend running on http://0.0.0.0:${server.port}`);
