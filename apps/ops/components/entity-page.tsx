"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Loader2, Plus, Search, Trash2 } from "lucide-react"
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
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { downloadCsv, formatDateTime, toCsv } from "@/lib/format"
import { EntityTableSkeleton } from "@/components/entity-table-skeleton"

export type ColumnDef<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  csv?: (row: T) => string | number | null
}

export type DetailFieldDef<T> = {
  key: string
  label: string
  render: (row: T) => React.ReactNode
}

type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type EntityPageProps<T extends { id: number }> = {
  title: string
  description: string
  apiPath: string
  columns: ColumnDef<T>[]
  emptyMessage?: string
  initialData?: Paginated<T>
  detailFields?: DetailFieldDef<T>[]
  getRecordTitle?: (row: T) => string
  renderForm: (props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial?: T | null
    onSubmit: (values: Record<string, unknown>) => Promise<void>
    saving: boolean
  }) => React.ReactNode
  getCsvRow?: (row: T) => Record<string, unknown>
}

export function EntityPage<T extends { id: number }>({
  title,
  description,
  apiPath,
  columns,
  emptyMessage = "No records yet.",
  initialData,
  detailFields,
  getRecordTitle,
  renderForm,
  getCsvRow,
}: EntityPageProps<T>) {
  const [data, setData] = useState<Paginated<T> | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [viewing, setViewing] = useState<T | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const detailRows =
    detailFields ??
    columns.map((column) => ({
      key: column.key,
      label: column.header,
      render: column.render,
    }))

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(search ? { search } : {}),
      })
      const res = await fetch(`${apiPath}?${params}`)
      if (!res.ok) throw new Error("Failed to load")
      setData(await res.json())
    } catch {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [apiPath, page, search])

  useEffect(() => {
    if (initialData && page === 1 && !search) {
      return
    }
    void fetchData()
  }, [fetchData, initialData, page, search])

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true)
    try {
      const url = editing ? `${apiPath}/${editing.id}` : apiPath
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Save failed")
      }
      toast.success(editing ? "Updated" : "Created")
      setFormOpen(false)
      setEditing(null)
      setViewing(null)
      void fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`${apiPath}/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast.success("Deleted")
      setDeleteId(null)
      setViewing(null)
      void fetchData()
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = () => {
    if (!data?.items.length) return
    const csvColumns = columns.filter((c) => c.csv).map((c) => c.key)
    const rows = data.items.map((row) => {
      if (getCsvRow) return getCsvRow(row)
      return Object.fromEntries(
        columns
          .filter((c) => c.csv)
          .map((c) => [c.key, c.csv!(row)]),
      )
    })
    downloadCsv(`${apiPath.replace("/api/", "")}.csv`, toCsv(rows, csvColumns))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.items.length}>
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EntityTableSkeleton columnCount={columns.length} rows={5} bodyOnly />
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setViewing(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.render(row)}</TableCell>
                  ))}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(row)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteId(row.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} total · page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {renderForm({
        open: formOpen,
        onOpenChange: (open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        },
        initial: editing,
        onSubmit: handleSubmit,
        saving,
      })}

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {getRecordTitle?.(viewing) ?? `Record #${viewing.id}`}
                </DialogTitle>
                {"created_at" in viewing && (
                  <DialogDescription>
                    Submitted{" "}
                    {formatDateTime(
                      (viewing as T & { created_at?: string }).created_at,
                    )}
                  </DialogDescription>
                )}
              </DialogHeader>
              <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(0,7rem)_1fr]">
                {detailRows.map((field) => (
                  <div key={field.key} className="contents">
                    <dt className="text-muted-foreground">{field.label}</dt>
                    <dd className="min-w-0 break-words font-medium">
                      {field.render(viewing)}
                    </dd>
                  </div>
                ))}
              </dl>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewing(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setDeleteId(viewing.id)
                    setViewing(null)
                  }}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(viewing)
                    setFormOpen(true)
                    setViewing(null)
                  }}
                >
                  Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Record #{deleteId} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function SimpleFormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSubmit,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: Array<{
    name: string
    label: string
    type?: string
    required?: boolean
    options?: Array<{ value: string; label: string }>
  }>
  initial?: Record<string, unknown> | null
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  saving: boolean
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      const next: Record<string, string> = {}
      for (const f of fields) {
        const v = initial?.[f.name]
        next[f.name] = v != null ? String(v) : ""
      }
      setValues(next)
    }
  }, [open, initial, fields])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void onSubmit(values)
          }}
        >
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.options ? (
                <select
                  id={field.name}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  required={field.required}
                >
                  <option value="">Select…</option>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={field.name}
                  type={field.type ?? "text"}
                  value={values[field.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  required={field.required}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
