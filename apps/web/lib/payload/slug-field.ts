import type { FieldHook } from "payload"

export function slugFromTitle(titleField: string): FieldHook {
  return ({ value, data }) => {
    if (typeof value === "string" && value.trim()) {
      return value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
    }

    const title = data?.[titleField]
    if (typeof title === "string" && title.trim()) {
      return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
    }

    return value
  }
}
