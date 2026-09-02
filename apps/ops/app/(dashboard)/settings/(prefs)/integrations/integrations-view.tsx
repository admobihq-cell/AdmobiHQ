"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Gift,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import {
  DataTable,
  DataTableSortHeader,
  type ColumnDef,
  type SortingState,
} from "@/components/ui/data-table"
import { SectionHeading } from "@/components/ui/section-heading"
import { StatCard } from "@/components/ui/stat-card"
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  RATES_AS_OF,
  STATUS_LABEL,
  USD_KES,
  EUR_USD,
  formatKes,
  formatUsd,
  monthlyUsd,
  toUsd,
  totals,
} from "@/lib/integration-costs"
import type { IntegrationDto } from "@/lib/queries/integrations"

import { deleteIntegration, saveIntegration, seedIntegrations } from "./actions"
import {
  IntegrationFormDialog,
  type IntegrationFormValues,
} from "./integration-form-dialog"

const STATUS_BADGE: Record<string, "secondary" | "outline" | "destructive"> = {
  active: "secondary",
  trial: "outline",
  review: "outline",
  canceled: "destructive",
}

function costCell(i: IntegrationDto) {
  if (i.billing_cycle === "free") {
    return { value: "$0", hint: "free" }
  }
  if (i.billing_cycle === "usage") {
    return { value: "Usage", hint: "no fixed fee" }
  }
  const native =
    i.currency !== "USD" ? ` · ${i.cost.toLocaleString()} ${i.currency}` : ""
  const cycle =
    i.billing_cycle === "annual"
      ? `/mo of ${formatUsd(toUsd(i.cost, i.currency), true)}/yr`
      : "/ mo"
  return { value: formatUsd(monthlyUsd(i), true), hint: `${cycle}${native}` }
}

export function IntegrationsView({ integrations }: { integrations: IntegrationDto[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<IntegrationDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<IntegrationDto | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: "cost", desc: true }])

  const summary = useMemo(() => totals(integrations), [integrations])

  function handleSubmit(values: IntegrationFormValues) {
    startTransition(async () => {
      const result = await saveIntegration({
        id: values.id,
        name: values.name,
        category: values.category,
        purpose: values.purpose,
        url: values.url,
        plan: values.plan,
        cost: values.cost,
        currency: values.currency,
        billing_cycle: values.billing_cycle,
        status: values.status,
        owner: values.owner,
        notes: values.notes,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(values.id ? "Integration updated" : "Integration added")
      setFormOpen(false)
      setEditing(null)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteIntegration(deleteTarget.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Integration removed")
      setDeleteTarget(null)
      router.refresh()
    })
  }

  function handleSeed() {
    startTransition(async () => {
      const result = await seedIntegrations()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Starter list loaded")
      router.refresh()
    })
  }

  const columns: ColumnDef<IntegrationDto, any>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataTableSortHeader
          label="Service"
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      meta: { headerClassName: "w-[34%]" },
      cell: ({ row }) => {
        const i = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 font-medium">
              <span className={i.status === "canceled" ? "line-through opacity-70" : ""}>
                {i.name}
              </span>
              {i.url ? (
                <a
                  href={i.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  aria-label={`Open ${i.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowUpRight className="size-3.5" />
                </a>
              ) : null}
            </div>
            {i.purpose ? (
              <span className="text-xs text-muted-foreground">{i.purpose}</span>
            ) : null}
          </div>
        )
      },
    },
    {
      id: "category",
      accessorFn: (row) => CATEGORY_LABEL[row.category] ?? row.category,
      header: ({ column }) => (
        <DataTableSortHeader
          label="Category"
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      meta: { headerClassName: "w-[16%]" },
      cell: ({ row }) => (
        <span className="flex items-center gap-2 text-sm">
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: CATEGORY_COLOR[row.original.category] ?? "#888" }}
          />
          {CATEGORY_LABEL[row.original.category] ?? row.original.category}
        </span>
      ),
    },
    {
      id: "plan",
      accessorFn: (row) => row.plan,
      header: "Plan",
      meta: { headerClassName: "w-[22%]" },
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm">{row.original.plan || "—"}</span>
          <span>
            <Badge variant={STATUS_BADGE[row.original.status] ?? "outline"}>
              {STATUS_LABEL[row.original.status] ?? row.original.status}
            </Badge>
          </span>
        </div>
      ),
    },
    {
      id: "cost",
      accessorFn: (row) => monthlyUsd(row),
      header: ({ column }) => (
        <div className="text-right">
          <DataTableSortHeader
            label="Monthly"
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        </div>
      ),
      meta: { headerClassName: "w-[16%] text-right", cellClassName: "text-right" },
      cell: ({ row }) => {
        const { value, hint } = costCell(row.original)
        return (
          <div className="flex flex-col items-end">
            <span className="font-medium tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      meta: { headerClassName: "w-[12%] text-right", cellClassName: "text-right" },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${row.original.name}`}
                onClick={() => {
                  setEditing(row.original)
                  setFormOpen(true)
                }}
              >
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${row.original.name}`}
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  const maxCategory = Math.max(1, ...summary.byCategory.map((c) => c.monthly))

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Integrations</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every third-party tool and subscription the platform runs on, and what it
          costs per month. Figures started from public list prices — keep each row
          current as plans change.
        </p>
      </div>

      {integrations.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Boxes className="size-5 text-primary" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No integrations tracked yet</p>
              <p className="text-sm text-muted-foreground">
                Load the starter list of 18 known tools, then edit or remove any of them.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSeed} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Load starter list"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                Add manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 bg-primary text-primary-foreground shadow-none">
            <CardContent className="space-y-6 p-6 md:p-8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/85">
                <CircleDollarSign className="size-4" aria-hidden />
                Recurring monthly spend
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {formatUsd(summary.monthlyUsd)}
                </p>
                <p className="text-lg text-primary-foreground/80 tabular-nums">
                  ≈ {formatKes(summary.monthlyKes)}
                </p>
              </div>
              <p className="text-sm text-primary-foreground/75">
                {formatUsd(summary.annualUsd)} / year · rates as of {RATES_AS_OF} (1&nbsp;USD&nbsp;=&nbsp;
                {USD_KES}&nbsp;KES, 1&nbsp;EUR&nbsp;=&nbsp;{EUR_USD}&nbsp;USD)
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Boxes}
              label="Active services"
              value={summary.activeCount}
              hint={`${integrations.length} tracked`}
            />
            <StatCard icon={Gift} label="On a $0 plan" value={summary.freeCount} />
            <StatCard
              icon={TrendingUp}
              label="Annualized"
              value={formatUsd(summary.annualUsd)}
            />
          </div>

          <div className="space-y-3">
            <SectionHeading
              title="Spend by category"
              description="Share of the fixed monthly total"
            />
            <div className="space-y-2">
              {summary.byCategory
                .slice()
                .sort((a, b) => b.monthly - a.monthly)
                .map((c) => (
                  <div key={c.value} className="flex items-center gap-3 text-sm">
                    <span className="w-36 shrink-0 truncate text-muted-foreground">{c.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (c.monthly / maxCategory) * 100)}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </span>
                    <span className="w-28 shrink-0 text-right tabular-nums">
                      {c.monthly > 0 ? formatUsd(c.monthly, true) : "—"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeading
              title="All services"
              description="Click a row's pencil to edit"
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Add integration
                </Button>
              }
            />
            <Card className="shadow-none">
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={integrations}
                  manualSorting={false}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  getRowId={(row) => String(row.id)}
                />
              </CardContent>
            </Card>

            {summary.usageNames.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Not in the monthly total (usage-based):
                </span>{" "}
                {summary.usageNames.join(", ")}. These bill per transaction or per call.
              </p>
            ) : null}
          </div>
        </>
      )}

      <IntegrationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        integration={editing}
        saving={pending}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4" />
              Remove {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the row from the integrations list. It won&apos;t affect the
              service itself or any billing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
