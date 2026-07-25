// Client-safe subset of @payloadcms/plugin-cloud-storage/utilities, vendored.
//
// The package's barrel (`@payloadcms/plugin-cloud-storage/utilities`) also
// exports resolveSignedURLKey, which imports `payload/internal` (server-only)
// and breaks webpack when bundled for the admin UI. Deep-importing around it
// (e.g. `@payloadcms/plugin-cloud-storage/dist/utilities/getFileKey.js`) is no
// longer possible either: the installed package's `exports` map only allows
// `./utilities` and `./client`, so any other subpath is rejected at resolve
// time. Vendoring these four small, dependency-light functions avoids both
// problems. Keep this in sync with the installed
// `@payloadcms/plugin-cloud-storage` version if it's upgraded.
import path from "path"
import { sanitizeFilename } from "payload/shared"

/**
 * Normalizes a storage prefix for use in object keys and URLs.
 *
 * Decodes URI components once (so query-style `%2F` becomes `/`), rejects
 * values that still contain percent-encodings after decoding (e.g. `%252f`),
 * then normalizes slashes, drops `.` / `..` segments, strips leading slashes,
 * and removes control characters.
 */
export function sanitizePrefix(prefix) {
  let decodedPrefix
  try {
    decodedPrefix = decodeURIComponent(prefix)
  } catch {
    return ""
  }
  // Reject multi-encoded values (e.g. `%252f`) by allowing only a single decode pass.
  if (/%[0-9a-f]{2}/i.test(decodedPrefix)) {
    return ""
  }
  return decodedPrefix
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment !== ".." && segment !== ".")
    .join("/")
    .replace(/^\/+/, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
}

/**
 * Computes the file key (path) for storage.
 *
 * In non-composite mode (useCompositePrefixes: false), docPrefix overrides collectionPrefix.
 * In composite mode (useCompositePrefixes: true), both are combined.
 * Both prefixes are passed through {@link sanitizePrefix} so keys stay normalized.
 */
export function getFileKey({
  collectionPrefix,
  docPrefix,
  filename,
  useCompositePrefixes = false,
}) {
  const safeCollectionPrefix = sanitizePrefix(collectionPrefix || "")
  const safeDocPrefix = sanitizePrefix(docPrefix || "")
  const safeFilename = sanitizeFilename(filename)
  const fileKey = useCompositePrefixes
    ? path.posix.join(safeCollectionPrefix, safeDocPrefix, safeFilename)
    : path.posix.join(safeDocPrefix || safeCollectionPrefix, safeFilename)
  return {
    fileKey,
    sanitizedCollectionPrefix: safeCollectionPrefix,
    sanitizedDocPrefix: safeDocPrefix,
    sanitizedFilename: safeFilename,
  }
}

/**
 * Resolves the file prefix from the highest-priority available source and
 * always returns a sanitized value.
 *
 * Resolution order:
 * 1. `prefixQueryParam`
 * 2. `clientUploadContext.prefix`
 * 3. Stored document `prefix` from the database
 */
export async function getFilePrefix({
  clientUploadContext,
  collection,
  filename,
  prefixQueryParam,
  req,
}) {
  if (typeof prefixQueryParam === "string") {
    return sanitizePrefix(prefixQueryParam)
  }
  if (
    clientUploadContext &&
    typeof clientUploadContext === "object" &&
    "prefix" in clientUploadContext &&
    typeof clientUploadContext.prefix === "string"
  ) {
    return sanitizePrefix(clientUploadContext.prefix)
  }
  const imageSizes = collection?.upload?.imageSizes || []
  const files = await req.payload.find({
    collection: collection.slug,
    depth: 0,
    draft: true,
    limit: 1,
    pagination: false,
    where: {
      or: [
        { filename: { equals: filename } },
        ...imageSizes.map((imageSize) => ({
          [`sizes.${imageSize.name}.filename`]: { equals: filename },
        })),
      ],
    },
  })
  const prefix = files?.docs?.[0]?.prefix
  return prefix ? sanitizePrefix(prefix) : ""
}

export const initClientUploads = ({
  clientHandler,
  collections,
  config,
  enabled,
  extraClientHandlerProps,
  serverHandler,
  serverHandlerPath,
}) => {
  if (enabled) {
    if (!config.endpoints) {
      config.endpoints = []
    }
    /**
     * Tracks how many times the same handler was already applied.
     * This allows to apply the same plugin multiple times, for example
     * to use different buckets for different collections.
     */
    let handlerCount = 0
    for (const endpoint of config.endpoints) {
      // We want to match on 'path', 'path-1', 'path-2', etc.
      if (endpoint.path?.startsWith(serverHandlerPath)) {
        handlerCount++
      }
    }
    if (handlerCount) {
      serverHandlerPath = `${serverHandlerPath}-${handlerCount}`
    }
    config.endpoints.push({
      handler: serverHandler,
      method: "post",
      path: serverHandlerPath,
    })
  }
  if (!config.admin) {
    config.admin = {}
  }
  if (!config.admin.dependencies) {
    config.admin.dependencies = {}
  }
  // Ensure client handler is always part of the import map, to avoid
  // import map discrepancies between dev and prod
  config.admin.dependencies[clientHandler] = {
    type: "function",
    path: clientHandler,
  }
  if (!config.admin.components) {
    config.admin.components = {}
  }
  if (!config.admin.components.providers) {
    config.admin.components.providers = []
  }
  for (const collectionSlug in collections) {
    const collection = collections[collectionSlug]
    let collectionPrefix
    if (
      collection &&
      typeof collection === "object" &&
      "prefix" in collection &&
      typeof collection.prefix === "string"
    ) {
      collectionPrefix = collection.prefix
    }
    config.admin.components.providers.push({
      clientProps: {
        collectionSlug,
        enabled,
        extra: extraClientHandlerProps ? extraClientHandlerProps(collection) : undefined,
        prefix: collectionPrefix,
        serverHandlerPath,
      },
      path: clientHandler,
    })
  }
}
