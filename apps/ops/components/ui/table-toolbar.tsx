"use client"

import { ChevronDown, Download, Search, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { ExportFormat } from "@/lib/table-export"

function ExportMenu({
  label,
  disabled,
  onExport,
}: {
  label: string
  disabled?: boolean
  onExport: (format: ExportFormat) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download data-icon="inline-start" />
          {label}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("xlsx")}>
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("pdf")}>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("csv")}>
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The one toolbar row every ops list page uses: search, filters, export,
 * then page-specific actions (e.g. "Add"). */
export function TableToolbar({
  search,
  filters,
  onExport,
  exportDisabled,
  actions,
}: {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  filters?: React.ReactNode
  onExport: (format: ExportFormat) => void
  exportDisabled?: boolean
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search ? (
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={search.placeholder ?? "Search…"}
            className="pl-8"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <ExportMenu
        label="Export"
        disabled={exportDisabled}
        onExport={onExport}
      />
      {filters}
      {actions}
    </div>
  )
}

/** Shown while rows are selected: count, page-specific bulk actions, export
 * of the selection, and clear. */
export function BulkBar({
  count,
  onExport,
  onClear,
  busy,
  children,
}: {
  count: number
  onExport: (format: ExportFormat) => void
  onClear: () => void
  busy?: boolean
  children?: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
        <ExportMenu
          label="Export selected"
          disabled={busy}
          onExport={onExport}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={busy}
          aria-label="Clear selection"
        >
          <X />
        </Button>
      </div>
    </div>
  )
}

// Radix's Select forbids an item value of "" (reserved to mean "no
// selection"), so "all" needs a sentinel — callers keep "" for "all".
const ALL = "__all__"

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  allLabel: string
}) {
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(v === ALL ? "" : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
