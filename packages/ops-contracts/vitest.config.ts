import { mergeConfig } from "vitest/config"

import shared from "@workspace/vitest-config/node"

export default mergeConfig(shared, {})
