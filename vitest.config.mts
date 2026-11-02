import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: "./tests/global-setup.ts",
    env: {
      DATABASE_URL: "file:./test.db",
      SESSION_SECRET:
        "test-session-secret-0123456789abcdef0123456789abcdef",
    },
    testTimeout: 20_000,
  },
});
