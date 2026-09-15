import path from "node:path"
import { fileURLToPath } from "node:url"
import { mergeConfig } from "vitest/config"

import shared from "@workspace/vitest-config/node"

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(shared, {
  resolve: {
    alias: {
      "@": dirname,
    },
  },
  // This app's tsconfig sets "jsx": "preserve" (Next's own compiler does
  // the real transform in the app itself), which leaves Vitest's esbuild
  // with no signal to use React's automatic JSX runtime — needed here
  // because lib/pdf/*.test.tsx render JSX directly, the first such tests
  // in this project's Vitest config.
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    include: [
      "lib/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.{test,spec}.{ts,tsx}",
    ],
    // Several suites talk to the shared Neon instance, each with its own
    // Prisma pool. Run files one at a time — in parallel they exhaust the
    // connection limit and fail with pg-pool timeouts that look like test
    // failures but aren't.
    fileParallelism: false,
  },
})
