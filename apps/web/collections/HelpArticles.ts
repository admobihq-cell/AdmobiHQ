import type { CollectionConfig } from "payload"

import {
  revalidateHelpAfterChange,
  revalidateHelpAfterDelete,
} from "@/lib/payload/revalidate-help"
import { slugFromTitle } from "@/lib/payload/slug-field"

export const HelpArticles: CollectionConfig = {
  slug: "help-articles",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "featured", "updatedAt"],
  },
  versions: {
    drafts: true,
  },
  access: {
    read: ({ req }) => {
      if (req.user) {
        return true
      }
      return {
        _status: {
          equals: "published",
        },
      }
    },
  },
  hooks: {
    afterChange: [revalidateHelpAfterChange],
    afterDelete: [revalidateHelpAfterDelete],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
      },
      hooks: {
        beforeValidate: [slugFromTitle("title")],
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "help-categories",
      required: true,
    },
    {
      name: "excerpt",
      type: "textarea",
      required: true,
      maxLength: 300,
    },
    {
      name: "body",
      type: "richText",
      required: true,
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "seoTitle",
      type: "text",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "seoDescription",
      type: "textarea",
      admin: {
        position: "sidebar",
      },
    },
  ],
}
