import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"

type LexicalNode = {
  type?: string
  tag?: string
  text?: string
  children?: LexicalNode[]
}

export type HeadingAnchor = {
  id: string
  text: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

export function extractHeadingIds(
  body: SerializedEditorState | null | undefined,
): HeadingAnchor[] {
  if (!body?.root?.children) {
    return []
  }

  const headings: HeadingAnchor[] = []

  const walk = (nodes: LexicalNode[]) => {
    for (const node of nodes) {
      if (node.type === "heading" && (node.tag === "h2" || node.tag === "h3")) {
        const text = collectText(node.children ?? [])
        if (text) {
          headings.push({ id: slugify(text), text })
        }
      }
      if (node.children?.length) {
        walk(node.children)
      }
    }
  }

  walk(body.root.children as LexicalNode[])
  return headings
}

function collectText(nodes: LexicalNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" && node.text) {
        return node.text
      }
      if (node.children?.length) {
        return collectText(node.children)
      }
      return ""
    })
    .join("")
    .trim()
}
