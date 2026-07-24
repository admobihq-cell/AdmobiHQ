const { getDefaultConfig } = require("expo/metro-config")
const { FileStore } = require("metro-cache")
const os = require("node:os")
const path = require("node:path")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")
const mobileModules = path.resolve(projectRoot, "node_modules")

const workspacePackages = {
  "@workspace/geo": path.resolve(workspaceRoot, "packages/geo"),
  "@workspace/ops-api-client": path.resolve(
    workspaceRoot,
    "packages/ops-api-client",
  ),
  "@workspace/ops-contracts": path.resolve(
    workspaceRoot,
    "packages/ops-contracts",
  ),
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot)

// Metro's default cache dir (os.tmpdir()/metro-cache) is shared across every
// project on the machine. Give this app its own so concurrent builds of
// ops-mobile and customer-mobile don't race each other's cache-clear (EPERM).
config.cacheStores = [
  new FileStore({ root: path.join(os.tmpdir(), "metro-cache-ops-mobile") }),
]

// Only watch packages this app imports — not the whole monorepo (avoids
// ENOENT spam from sibling Next.js apps writing under apps/*/.next).
config.watchFolders = Object.values(workspacePackages)
config.resolver.nodeModulesPaths = [
  mobileModules,
  path.resolve(workspaceRoot, "node_modules"),
]

const appsDir = path.resolve(workspaceRoot, "apps").replace(/\\/g, "/")
config.resolver.blockList = [
  new RegExp(
    `${appsDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/\\.next/.*`,
  ),
]

function resolveFromMobile(moduleName) {
  return require.resolve(moduleName, { paths: [mobileModules] })
}

// Web workspaces hoist react@19.2.x at the root; mobile pins react@19.1.x.
// Also pin workspace packages so Metro (especially web) resolves them.
config.resolver.extraNodeModules = {
  react: path.dirname(resolveFromMobile("react/package.json")),
  "react-dom": path.dirname(resolveFromMobile("react-dom/package.json")),
  ...workspacePackages,
}

const reactAliases = new Set([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
])

const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (reactAliases.has(moduleName) || moduleName.startsWith("react-dom/")) {
    return {
      filePath: resolveFromMobile(moduleName),
      type: "sourceFile",
    }
  }

  // Explicit entry for workspace packages (Expo web often fails on exports-only).
  if (moduleName === "@workspace/geo") {
    return {
      filePath: path.join(workspacePackages["@workspace/geo"], "src/index.ts"),
      type: "sourceFile",
    }
  }
  if (moduleName === "@workspace/ops-api-client") {
    return {
      filePath: path.join(
        workspacePackages["@workspace/ops-api-client"],
        "src/index.ts",
      ),
      type: "sourceFile",
    }
  }
  if (moduleName === "@workspace/ops-contracts") {
    return {
      filePath: path.join(
        workspacePackages["@workspace/ops-contracts"],
        "src/index.ts",
      ),
      type: "sourceFile",
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
