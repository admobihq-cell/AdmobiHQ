"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Download, Lock, Save } from "lucide-react"
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import {
  billingDocumentInputSchema,
  exportFileName,
  nairobiDay,
  type BillingDocumentDto,
  type BillingDocumentInput,
  type BillingDocumentOptionsDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { BillingDocumentForm } from "@/components/billing/billing-document-form"
import { DocumentActions } from "@/components/billing/document-actions"
import { PaymentsPanel } from "@/components/billing/payments-panel"
import { PdfPreview } from "@/components/billing/pdf-preview"
import { billingPillProps } from "@/components/finances/billing-status"
import { downloadBlob } from "@/lib/format"
import { useOpsClient } from "@/lib/ops-client"

const addDays = (isoDay: string, days: number) =>
  new Date(new Date(`${isoDay}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10)

/** A new document starts with no organization. Defaulting to one would attach a
 * prospect's invoice to whichever org sorts first — and show it to them on send. */
function blankDocument(options: BillingDocumentOptionsDto): BillingDocumentInput {
  const today = nairobiDay(new Date())
  return {
    kind: "invoice",
    orgId: null,
    campaignId: null,
    customer: { name: "", contact: "", email: "", phone: "", address: "", taxPin: "", reference: "" },
    issueDate: today,
    dueDate: addDays(today, 14),
    reference: "",
    lines: [{ description: "", unit: "", quantity: 1, unitPriceKes: 0, taxable: true }],
    discountPct: 0,
    taxPct: 0,
    feeLabel: "",
    feeKes: 0,
    note: options.defaults.note,
    paymentInstructions: options.defaults.paymentInstructions,
    terms: options.defaults.invoiceTerms,
  }
}

/** Only the editable fields — a DTO carries totals, payments and status too. */
function toInput(doc: BillingDocumentDto): BillingDocumentInput {
  return {
    kind: doc.kind,
    orgId: doc.orgId,
    campaignId: doc.campaignId,
    customer: doc.customer,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    reference: doc.reference,
    lines: doc.lines,
    discountPct: doc.discountPct,
    taxPct: doc.taxPct,
    feeLabel: doc.feeLabel,
    feeKes: doc.feeKes,
    note: doc.note,
    paymentInstructions: doc.paymentInstructions,
    terms: doc.terms,
  }
}

export const documentQueryKey = (id: number) => ["billing-documents", id] as const

/** The SwiftQuote-style editor: form on the left, the real PDF on the right. */
export function BillingDocumentEditor({ id }: { id: number | null }) {
  const client = useOpsClient()
  const options = useQuery({
    queryKey: ["billing-documents", "options"],
    queryFn: () => client.billingDocuments.options(),
  })
  const doc = useQuery({
    queryKey: documentQueryKey(id ?? 0),
    queryFn: () => client.billingDocuments.get(id!),
    enabled: id !== null,
  })

  if (options.isError || doc.isError) {
    return <ApiErrorBanner message={formatApiError(options.error ?? doc.error)} />
  }
  if (!options.data || (id !== null && !doc.data)) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <Skeleton className="h-[70vh] w-full" />
        <Skeleton className="hidden h-[70vh] w-full lg:block" />
      </div>
    )
  }
  return <EditorBody key={doc.data?.id ?? "new"} options={options.data} saved={doc.data ?? null} />
}

function EditorBody({ options, saved }: { options: BillingDocumentOptionsDto; saved: BillingDocumentDto | null }) {
  const client = useOpsClient()
  const router = useRouter()
  const queryClient = useQueryClient()
  const defaults = useMemo(() => (saved ? toInput(saved) : blankDocument(options)), [saved, options])
  const form = useForm<BillingDocumentInput>({
    resolver: zodResolver(billingDocumentInputSchema) as Resolver<BillingDocumentInput>,
    defaultValues: defaults,
    mode: "onTouched",
  })
  const values = useWatch({ control: form.control }) as BillingDocumentInput
  const locked = saved !== null && saved.status !== "draft"
  const isDirty = form.formState.isDirty

  // A status change or payment returns a fresh document: adopt it without
  // remounting, so the preview keeps its last render instead of blanking.
  const savedVersion = saved?.updatedAt
  useEffect(() => {
    if (saved) form.reset(toInput(saved))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when the server copy changes
  }, [savedVersion])

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  const save = useMutation({
    mutationFn: (input: BillingDocumentInput) =>
      saved ? client.billingDocuments.update(saved.id, input) : client.billingDocuments.create(input),
    onSuccess: async (result) => {
      toast.success(`Saved ${result.number}`)
      form.reset(toInput(result))
      queryClient.setQueryData(documentQueryKey(result.id), result)
      await queryClient.invalidateQueries({ queryKey: ["billing-documents"], exact: true })
      if (!saved) router.replace(`/finances/documents/${result.id}`)
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  const download = useMutation({
    mutationFn: async () => {
      const blob = await client.billingDocuments.pdf(saved!.id)
      downloadBlob(exportFileName(saved!.kind, saved!.number.replaceAll("/", "-"), "pdf"), blob)
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  /** Saves pending edits first; resolves to the saved document. */
  const saveIfDirty = async (): Promise<BillingDocumentDto | null> => {
    if (!saved) return null
    if (!form.formState.isDirty) return saved
    let result: BillingDocumentDto | null = null
    await form.handleSubmit(async (input) => {
      result = await save.mutateAsync(input)
    })()
    return result
  }

  const pill = saved ? billingPillProps(saved) : null
  const title = saved ? saved.number : values.kind === "quote" ? "New quote" : "New invoice"

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Back to invoices and quotes">
              <Link href="/finances?tab=documents">
                <ArrowLeft aria-hidden />
              </Link>
            </Button>
            <h1 className="truncate text-xl font-semibold tracking-tight tabular-nums">{title}</h1>
            {saved ? null : (
              <span className="rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                Number on first save
              </span>
            )}
            {pill ? <StatusPill tone={pill.tone}>{pill.label}</StatusPill> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <Button variant="outline" onClick={() => download.mutate()} loading={download.isPending} loadingText="Preparing…">
                <Download aria-hidden />
                Download PDF
              </Button>
            ) : null}
            {!locked ? (
              <Button
                variant={saved ? "outline" : "default"}
                onClick={form.handleSubmit((input) => save.mutate(input))}
                loading={save.isPending}
                loadingText="Saving…"
                disabled={saved !== null && !isDirty}
              >
                <Save aria-hidden />
                {saved ? "Save changes" : "Save"}
              </Button>
            ) : null}
            {saved ? <DocumentActions doc={saved} saveIfDirty={saveIfDirty} /> : null}
          </div>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,560px)_1fr]">
          <div className="flex min-w-0 flex-col gap-6">
            {locked ? (
              <p className="flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
                Sent documents are locked. Void and re-issue to change them.
              </p>
            ) : null}
            {saved && saved.kind === "invoice" && saved.status !== "draft" ? <PaymentsPanel doc={saved} /> : null}
            <form onSubmit={form.handleSubmit((input) => save.mutate(input))} noValidate>
              <fieldset disabled={locked} className="min-w-0 disabled:opacity-80">
                <BillingDocumentForm options={options} kindLocked={saved !== null} />
              </fieldset>
            </form>
          </div>
          <aside className="rounded-2xl bg-muted/60 p-4 sm:p-6 lg:sticky lg:top-4">
            <PdfPreview
              input={values}
              id={saved?.id}
              version={saved ? `${saved.status}:${saved.paidKes}:${saved.payments.length}` : undefined}
            />
          </aside>
        </div>
      </div>
    </FormProvider>
  )
}
