import { RichText } from "@payloadcms/richtext-lexical/react"
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"
import type { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react"

import { slugifyHeading } from "@/lib/payload/lexical-headings"

type LexicalRendererProps = {
  data: SerializedEditorState
}

type HeadingNode = {
  tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  children?: Array<{ type?: string; text?: string; children?: unknown[] }>
}

function headingText(node: HeadingNode): string {
  const walk = (nodes: HeadingNode["children"] = []): string =>
    nodes
      .map((child) => {
        if (child.type === "text" && child.text) {
          return child.text
        }
        if (Array.isArray(child.children)) {
          return walk(child.children as HeadingNode["children"])
        }
        return ""
      })
      .join("")

  return walk(node.children).trim()
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  heading: ({ node, nodesToJSX }) => {
    const Tag = node.tag
    const children = nodesToJSX({ nodes: node.children })
    const id = slugifyHeading(headingText(node as HeadingNode))
    return (
      <Tag id={id || undefined} className="scroll-mt-28">
        {children}
      </Tag>
    )
  },
  table: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    return (
      <div className="help-table-wrap my-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="help-table w-full min-w-[28rem] border-collapse text-left text-sm">
          <tbody>{children}</tbody>
        </table>
      </div>
    )
  },
  tablerow: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    return <tr className="border-border border-b last:border-b-0">{children}</tr>
  },
  tablecell: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    const isHeader = node.headerState > 0
    const Tag = isHeader ? "th" : "td"
    return (
      <Tag
        className={
          isHeader
            ? "bg-muted text-foreground border-border border px-3 py-2.5 font-medium"
            : "text-muted-foreground border-border border px-3 py-2.5 align-top leading-relaxed"
        }
        colSpan={node.colSpan && node.colSpan > 1 ? node.colSpan : undefined}
        rowSpan={node.rowSpan && node.rowSpan > 1 ? node.rowSpan : undefined}
      >
        {children}
      </Tag>
    )
  },
})

export function LexicalRenderer({ data }: LexicalRendererProps) {
  return (
    <div className="payload-richtext prose prose-neutral dark:prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_figure]:my-8 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-xl [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_td_p]:my-0 [&_th_p]:my-0">
      <RichText data={data} converters={converters} />
    </div>
  )
}
