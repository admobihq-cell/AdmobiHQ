import { RichText } from "@payloadcms/richtext-lexical/react"
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"

type LexicalRendererProps = {
  data: SerializedEditorState
}

export function LexicalRenderer({ data }: LexicalRendererProps) {
  return (
    <div className="payload-richtext prose prose-neutral dark:prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_figure]:my-8 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-xl [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_p]:leading-relaxed">
      <RichText data={data} />
    </div>
  )
}
