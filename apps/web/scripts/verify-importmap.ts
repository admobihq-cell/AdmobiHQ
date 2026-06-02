import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const importMapPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../app/(payload)/admin/importMap.js",
)

const FORBIDDEN = [
  "@payloadcms/storage-vercel-blob/client'",
  '@payloadcms/storage-vercel-blob/client"',
]

const LEGACY_BLOB_HANDLER_KEY =
  '"@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler"'
const PATCHED_BLOB_HANDLER_KEY =
  '"./lib/payload/vercel-blob-client-stub#VercelBlobClientUploadHandler"'

export function verifyImportMap(): void {
  const source = readFileSync(importMapPath, "utf8")

  const violations = FORBIDDEN.filter((snippet) => source.includes(snippet))

  if (violations.length > 0) {
    throw new Error(
      [
        "importMap.js imports the real Vercel Blob client handler.",
        "That pulls server-only Payload code into the admin bundle (worker_threads / child_process errors).",
        "",
        "Fix:",
        "  npm run generate:importmap -w web",
        "  # or",
        "  npx tsx scripts/fix-importmap.ts",
        "",
        `File: ${importMapPath}`,
      ].join("\n"),
    )
  }

  const usesBlobHandler =
    source.includes(LEGACY_BLOB_HANDLER_KEY) || source.includes(PATCHED_BLOB_HANDLER_KEY)
  const usesStub = source.includes("vercel-blob-client-stub")

  if (usesBlobHandler && !usesStub) {
    throw new Error(
      [
        "importMap.js registers VercelBlobClientUploadHandler but not the local stub.",
        "Run: npm run generate:importmap -w web",
        "",
        `File: ${importMapPath}`,
      ].join("\n"),
    )
  }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  try {
    verifyImportMap()
    const source = readFileSync(importMapPath, "utf8")
    const usesBlobHandler =
      source.includes(LEGACY_BLOB_HANDLER_KEY) || source.includes(PATCHED_BLOB_HANDLER_KEY)
    console.log(
      usesBlobHandler
        ? "importMap: OK (Vercel Blob client stub)"
        : "importMap: OK (Vercel Blob handler not registered)",
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
