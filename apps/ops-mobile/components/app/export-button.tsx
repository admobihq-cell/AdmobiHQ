import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native"

import type { DocumentExportRequest } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
import { Receipt } from "@/components/icons"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { radius, useThemeColors } from "@/lib/theme"
import { exportRows, tableCells, type ExportColumn, type ExportKind } from "@/lib/export-list"

/**
 * "Export" for a list: pick CSV or PDF, then the file goes to the share sheet. `onExport` does the work;
 * a failure is shown under the button's label rather than lost. `label` says what is exported
 * ("Export 3 selected", "Export").
 */
export function ExportButton({
  label = "Export",
  onExport,
  onError,
}: {
  label?: string
  onExport: (kind: ExportKind) => Promise<void>
  onError?: (message: string) => void
}) {
  const colors = useThemeColors()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async (kind: ExportKind) => {
    setOpen(false)
    if (busy) return
    setBusy(true)
    try {
      await onExport(kind)
    } catch (e) {
      onError?.(formatOpsError(e, API_URL))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.button, { borderColor: colors.border, backgroundColor: colors.muted }, pressed && { opacity: 0.8 }]}
      >
        {busy ? <ActivityIndicator size="small" /> : <Receipt color={colors.text} size={16} />}
        <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
      </Pressable>
      <BottomSheetPicker
        visible={open}
        onClose={() => setOpen(false)}
        title="Export as"
        value=""
        options={[
          { value: "csv", label: "CSV (spreadsheet)" },
          { value: "pdf", label: "PDF" },
        ]}
        onSelect={(v) => void run(v as ExportKind)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  text: { fontSize: 14, fontWeight: "600" },
})

/** Export for a screen that already holds its rows (Team, Roles): columns in, share sheet out, errors shown inline. */
export function ListExportButton<T>({
  entity,
  title,
  columns,
  rows,
}: {
  entity: DocumentExportRequest["entity"]
  title: string
  columns: ExportColumn<T>[]
  rows: T[]
}) {
  const client = useOpsClient()
  const [error, setError] = useState<string | null>(null)
  if (rows.length === 0) return null
  return (
    <>
      <ExportButton
        onError={setError}
        onExport={async (kind) => {
          setError(null)
          const { headers, cells } = tableCells(columns, rows.slice(0, 500))
          await exportRows({ client, kind, entity, title, headers, rows: cells })
        }}
      />
      {error ? <ApiErrorBanner message={error} onRetry={() => setError(null)} /> : null}
    </>
  )
}
