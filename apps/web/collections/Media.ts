import path from "node:path"
import { fileURLToPath } from "node:url"

import type { CollectionConfig } from "payload"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    useAsTitle: "alt",
    defaultColumns: ["alt", "filename", "updatedAt"],
  },
  access: {
    read: () => true,
  },
  upload: {
    ...(process.env.BLOB_READ_WRITE_TOKEN?.trim()
      ? {}
      : { staticDir: path.resolve(dirname, "../media") }),
    adminThumbnail: "thumbnail",
    mimeTypes: ["image/*"],
    imageSizes: [
      {
        name: "thumbnail",
        width: 480,
        height: 320,
        position: "centre",
      },
      {
        name: "card",
        width: 960,
        height: 540,
        position: "centre",
      },
      {
        name: "hero",
        width: 1920,
        height: 1080,
        position: "centre",
      },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      label: "Alt text",
    },
    {
      name: "caption",
      type: "text",
      label: "Caption",
    },
  ],
}
