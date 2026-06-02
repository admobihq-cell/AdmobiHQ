import type { CollectionConfig } from "payload"

import {
  revalidateBlogAfterChange,
  revalidateBlogAfterDelete,
} from "@/lib/payload/revalidate-blog"
import { slugFromTitle } from "@/lib/payload/slug-field"

export const BlogPosts: CollectionConfig = {
  slug: "blog-posts",
  labels: {
    singular: "Blog post",
    plural: "Blog posts",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "authorName", "publishedAt", "featured", "updatedAt"],
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
    afterChange: [revalidateBlogAfterChange],
    afterDelete: [revalidateBlogAfterDelete],
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
      name: "excerpt",
      type: "textarea",
      required: true,
      maxLength: 320,
    },
    {
      name: "featuredImage",
      type: "upload",
      relationTo: "media",
      required: true,
      label: "Cover image",
    },
    {
      name: "authorName",
      type: "text",
      required: true,
      label: "Author name",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "authorRole",
      type: "text",
      label: "Author role",
      admin: {
        position: "sidebar",
        description: "e.g. Head of partnerships",
      },
    },
    {
      name: "publishedAt",
      type: "date",
      required: true,
      admin: {
        position: "sidebar",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "topic",
      type: "select",
      defaultValue: "insights",
      options: [
        { label: "OOH & media", value: "ooh" },
        { label: "Campaigns", value: "campaigns" },
        { label: "Product", value: "product" },
        { label: "Company", value: "company" },
        { label: "Insights", value: "insights" },
      ],
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "body",
      type: "richText",
      required: true,
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
