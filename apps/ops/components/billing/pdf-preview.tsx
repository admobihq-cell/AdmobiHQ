"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { billingDocumentInputSchema, type BillingDocumentInput } from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { useDebouncedValue } from "@/lib/use-debounced-value"
import { useOpsClient } from "@/lib/ops-client"

/**
 * The right-hand A4 panel. It shows the real PDF the server renders — the same
 * bytes an advertiser downloads — re-rendered 600 ms after typing stops. The
 * last good render stays up while a new one loads, so the panel never blanks.
 */
export function PdfPreview({
  input,
  id,
  version,
}: {
  input: BillingDocumentInput
  id?: number
  /** Changes when the saved document's status or payments change, so the pill and
   * Paid/Balance rows re-render even though the form itself did not change. */
  version?: string
}) {
  const client = useOpsClient()
  // Serialised so a new-but-equal object from the form doesn't re-render the PDF.
  const settled = useDebouncedValue(JSON.stringify({ input, version }), 600)
  const parsed = useMemo(() => billingDocumentInputSchema.safeParse(JSON.parse(settled).input), [settled])
  const valid = parsed.success ? parsed.data : null
  const [url, setUrl] = useState<string | null>(null)
  // Which input the in-flight / last request was for, so loading is derived, not set in the effect.
  const [rendered, setRendered] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ for: string; message: string } | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    client.billingDocuments
      .preview({ id, document: valid }, controller.signal)
      .then((blob) => {
        const next = URL.createObjectURL(blob)
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = next
        setUrl(next)
        setRendered(settled)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFailure({ for: settled, message: formatApiError(error) })
        setRendered(settled)
      })
    return () => controller.abort()
  }, [client, id, settled, valid])

  const loading = valid !== null && rendered !== settled
  const problem = !valid
    ? "Fix the highlighted fields to refresh the preview."
    : failure?.for === settled
      ? failure.message
      : null

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between pb-3 text-xs text-muted-foreground">
        <span>A4 preview</span>
        <span aria-live="polite" className="flex items-center gap-1.5">
          {loading ? (
            <>
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              Updating…
            </>
          ) : problem ? (
            <span className="text-destructive">{problem}</span>
          ) : null}
        </span>
      </div>
      <div className="mx-auto flex w-full max-w-[720px] flex-1 items-start justify-center">
        {url ? (
          <iframe
            key={url}
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            title="Document preview"
            className="aspect-[1/1.414] w-full rounded-sm bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-8px_rgb(0_0_0/0.18)]"
          />
        ) : (
          <div className="flex aspect-[1/1.414] w-full items-center justify-center rounded-sm bg-white text-sm text-muted-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-8px_rgb(0_0_0/0.18)]">
            {problem ?? "Rendering preview…"}
          </div>
        )}
      </div>
    </div>
  )
}
