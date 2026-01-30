/**
 * Test preload script - runs before any test imports
 * Sets up test environment variables
 */

process.env["NODE_ENV"] = "test";
process.env["TEST_DATABASE_URL"] = process.env["TEST_DATABASE_URL"] ?? 
  "postgres://postgres:postgres@localhost:5433/flynn_aac_test";

console.log("🧪 Test environment initialized");
