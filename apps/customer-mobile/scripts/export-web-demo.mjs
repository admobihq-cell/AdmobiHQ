// Exports the web build under the /app-demo base path (see app.config.js) so
// the compiled bundle's asset URLs resolve correctly once copied into
// apps/web/public/app-demo for the embedded marketing-site iframe demo.
import { spawnSync } from "node:child_process"

const result = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist-web-demo"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, EXPO_WEB_DEMO_BASE_URL: "/app-demo" },
})

process.exit(result.status ?? 1)
