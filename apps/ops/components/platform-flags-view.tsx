"use client"

import { useEffect, useState } from "react"
import { Rocket } from "lucide-react"
import type { PlatformFlagDto, PlatformFlagKey } from "@workspace/ops-contracts"

import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useOpsClient } from "@/lib/ops-client"

const FLAG_COPY: Record<string, { label: string; description: string }> = {
  deliveries: {
    label: "Deliveries",
    description:
      "Shows the Deliveries placeholder screens in customer-web, driver-web, and driver-mobile — the real booking/dispatch feature isn't built yet, this only controls whether the story is visible.",
  },
}

function formatUpdated(flag: PlatformFlagDto): string | null {
  if (!flag.updated_by_email) return null
  const when = new Date(flag.updated_at)
  if (Number.isNaN(when.getTime())) return null
  return `${flag.enabled ? "Enabled" : "Disabled"} by ${flag.updated_by_email} · ${when.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  })}`
}

function FlagSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: () => void
  disabled: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`block size-5 rounded-full bg-background shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

export function PlatformFlagsView() {
  const client = useOpsClient()
  const [flags, setFlags] = useState<PlatformFlagDto[] | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    client.flags
      .list()
      .then((res) => {
        if (!cancelled) setFlags(res.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load flags")
      })
    return () => {
      cancelled = true
    }
  }, [client])

  async function toggle(flag: PlatformFlagDto) {
    setPendingKey(flag.key)
    setError(null)
    try {
      const updated = await client.flags.update({
        key: flag.key as PlatformFlagKey,
        enabled: !flag.enabled,
      })
      setFlags((prev) => prev?.map((f) => (f.key === updated.key ? updated : f)) ?? prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update flag")
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Platform flags</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Visibility switches shared across every customer and driver app. Toggling here takes
          effect within about a minute — no deploy needed.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {flags === null ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="grid gap-4">
          {flags.map((flag) => {
            const copy = FLAG_COPY[flag.key] ?? { label: flag.key, description: "" }
            const updated = formatUpdated(flag)
            return (
              <Card key={flag.key} className="shadow-none">
                <CardContent className="flex items-start justify-between gap-6 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Rocket className="size-4 text-primary" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{copy.label}</p>
                      <p className="max-w-xl text-sm text-muted-foreground">{copy.description}</p>
                      {updated ? (
                        <p className="text-xs text-muted-foreground">{updated}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Never changed · off by default</p>
                      )}
                    </div>
                  </div>
                  <FlagSwitch
                    checked={flag.enabled}
                    disabled={pendingKey === flag.key}
                    onChange={() => toggle(flag)}
                    label={`Toggle ${copy.label}`}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
