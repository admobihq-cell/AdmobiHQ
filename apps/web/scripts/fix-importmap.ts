import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const importMapPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../app/(payload)/admin/importMap.js",
)

// Relative path from app/(payload)/admin/importMap.js → lib/payload/vercel-blob-client-stub
const STUB_IMPORT = `from '../../../lib/payload/vercel-blob-client-stub'`

const BLOB_IMPORT_PATTERNS = [
  /from '@payloadcms\/storage-vercel-blob\/client'/g,
  /from "@payloadcms\/storage-vercel-blob\/client"/g,
]

let source = readFileSync(importMapPath, "utf8")
let fixed = source

for (const pattern of BLOB_IMPORT_PATTERNS) {
  fixed = fixed.replace(pattern, STUB_IMPORT)
}

if (fixed !== source) {
  writeFileSync(importMapPath, fixed)
  console.log("importMap: swapped Vercel Blob client handler for local stub")
} else if (!fixed.includes("vercel-blob-client-stub")) {
  console.warn("importMap: no Vercel Blob client import found (blob plugin may be disabled)")
} else {
  console.log("importMap: Vercel Blob client stub already applied")
}

import { verifyImportMap } from "./verify-importmap"

try {
  verifyImportMap()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
