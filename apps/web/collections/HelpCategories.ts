import type { CollectionConfig } from "payload"

import { slugFromTitle } from "@/lib/payload/slug-field"

export const HelpCategories: CollectionConfig = {
  slug: "help-categories",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "kind", "audience", "sortOrder"],
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
      name: "description",
      type: "textarea",
    },
    {
      // "guide" categories hold how-to guides for the product and form the help
      // sidebar; "faq" categories hold the short question-and-answer articles.
      name: "kind",
      type: "select",
      required: true,
      defaultValue: "faq",
      options: [
        { label: "FAQ", value: "faq" },
        { label: "Product guides", value: "guide" },
      ],
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "audience",
      type: "select",
      required: true,
      options: [
        { label: "Advertisers", value: "advertiser" },
        { label: "Drivers", value: "driver" },
        { label: "Fleet partners", value: "fleet" },
        { label: "General", value: "general" },
      ],
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
      admin: {
        position: "sidebar",
      },
    },
  ],
}
