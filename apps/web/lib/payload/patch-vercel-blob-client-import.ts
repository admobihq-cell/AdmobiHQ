import type { Plugin } from "payload"

/** Import-map key Payload registers for Vercel Blob client uploads. */
export const VERCEL_BLOB_CLIENT_HANDLER =
  "@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler"

/** Local no-op handler (server-side Blob uploads only). */
export const VERCEL_BLOB_CLIENT_HANDLER_STUB =
  "./lib/payload/vercel-blob-client-stub#VercelBlobClientUploadHandler"

/**
 * The Vercel Blob storage plugin always registers the real client upload handler
 * in `admin.dependencies` even when `clientUploads` is false. That handler imports
 * server-only Payload code and breaks Next.js webpack/Turbopack admin builds.
 *
 * Run this plugin **after** `vercelBlobStorage()` so `generate:importmap` resolves
 * the stub path without a post-processing script.
 */
export function patchVercelBlobClientImport(): Plugin {
  return (incomingConfig) => {
    const config = { ...incomingConfig }

    if (!config.admin) {
      config.admin = {}
    }

    const dependencies = { ...config.admin.dependencies }
    const dependency = dependencies[VERCEL_BLOB_CLIENT_HANDLER]
    if (dependency && typeof dependency === "object") {
      dependencies[VERCEL_BLOB_CLIENT_HANDLER] = {
        ...dependency,
        path: VERCEL_BLOB_CLIENT_HANDLER_STUB,
      }
      config.admin = { ...config.admin, dependencies }
    }

    const providers = config.admin.components?.providers
    if (Array.isArray(providers)) {
      config.admin = {
        ...config.admin,
        components: {
          ...config.admin.components,
          providers: providers.map((provider) => {
            if (
              typeof provider === "object" &&
              provider !== null &&
              "path" in provider &&
              provider.path === VERCEL_BLOB_CLIENT_HANDLER
            ) {
              return { ...provider, path: VERCEL_BLOB_CLIENT_HANDLER_STUB }
            }
            return provider
          }),
        },
      }
    }

    return config
  }
}
