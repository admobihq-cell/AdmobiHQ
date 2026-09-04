import { mergeConfig } from "vitest/config"

import shared from "@workspace/vitest-config/node"

export default mergeConfig(shared, {
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
    include: ["lib/**/*.{test,spec}.{ts,tsx}"],
  },
})
