import { mergeConfig } from "vitest/config"

import shared from "@workspace/vitest-config/node"

export default mergeConfig(shared, {
  test: {
    include: ["lib/**/*.{test,spec}.{ts,tsx}"],
  },
})
