const { getDefaultConfig } = require("expo/metro-config")
const path = require("node:path")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")
const mobileModules = path.resolve(projectRoot, "node_modules")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot)

// Only watch packages this app imports — not the whole monorepo (avoids
// ENOENT spam from sibling Next.js apps writing under apps/*/.next).
config.watchFolders = [path.resolve(workspaceRoot, "packages/geo")]
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

config.resolver.extraNodeModules = {
  react: path.dirname(resolveFromMobile("react/package.json")),
  "react-dom": path.dirname(resolveFromMobile("react-dom/package.json")),
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

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
