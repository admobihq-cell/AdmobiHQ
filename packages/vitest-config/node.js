import { defineConfig } from "vitest/config"

/** Shared Vitest config for Node (packages / non-DOM) tests. */
export const nodeConfig = defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
})

export default nodeConfig
