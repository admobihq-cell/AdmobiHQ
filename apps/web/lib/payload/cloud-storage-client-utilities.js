// Client-safe subset of @payloadcms/plugin-cloud-storage/utilities.
// The package barrel also exports resolveSignedURLKey (server-only), which breaks
// webpack when bundled for the admin UI.
export { getFileKey } from "@payloadcms/plugin-cloud-storage/dist/utilities/getFileKey.js"
export { getFilePrefix } from "@payloadcms/plugin-cloud-storage/dist/utilities/getFilePrefix.js"
export { initClientUploads } from "@payloadcms/plugin-cloud-storage/dist/utilities/initClientUploads.js"
export { sanitizePrefix } from "@payloadcms/plugin-cloud-storage/dist/utilities/sanitizePrefix.js"
