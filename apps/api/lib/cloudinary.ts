import { v2 as cloudinary } from "cloudinary"

/**
 * Reserved for the fleet campaign-creative upload feature (not built yet).
 * The announcement-image feature intentionally uses Vercel Blob instead —
 * see lib/push/broadcast-customers.ts and app/v1/notifications/broadcast-image.
 *
 * Cloudinary's SDK auto-configures from the CLOUDINARY_URL env var
 * (cloudinary://<api_key>:<api_secret>@<cloud_name>) with no explicit
 * config() call needed, as long as it's set before this module is imported.
 */
export { cloudinary }
