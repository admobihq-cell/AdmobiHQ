"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Send, Siren } from "lucide-react"
import { toast } from "sonner"

import { SAFETY_TERMINAL_STATUSES, formatLabel } from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import {
  cancelIncident,
  getIncident,
  pingIncidentLocation,
  replyToIncident,
  uploadIncidentPhoto,
} from "@/lib/sos-client"
import { takePendingSosPhotos } from "@/lib/sos-pending-photos"

const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)
const PING_INTERVAL_MS = 120_000

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function SosTrackingClient({ incidentId }: { incidentId: number }) {
  const { getToken } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const [reply, setReply] = useState("")
  const [uploading, setUploading] = useState(0)
  const uploadedPending = useRef(false)

  const incidentQuery = useQuery({
    queryKey: ["sos", incidentId],
    queryFn: () => getIncident(getToken, incidentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL.has(status) ? false : 20_000
    },
  })

  const incident = incidentQuery.data
  const live = incident ? !TERMINAL.has(incident.status) : false

  // Upload the photos handed over from the submit page, one call each. Ops was
  // already alerted before any of this ran, and a guard ref stops a re-render
  // from starting the uploads twice.
  useEffect(() => {
    if (uploadedPending.current) return
    uploadedPending.current = true

    const files = takePendingSosPhotos(incidentId)
    if (files.length === 0) return

    void (async () => {
      setUploading(files.length)
      for (const file of files) {
        try {
          await uploadIncidentPhoto(getToken, incidentId, file)
        } catch (error) {
          // One failed photo must not stop the rest, and must never read as
          // "your report failed" — the report is already filed.
          console.error("[sos] photo upload failed", error)
        } finally {
          setUploading((n) => n - 1)
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["sos", incidentId] })
    })()
  }, [incidentId, getToken, queryClient])

  // Web counterpart of useIncidentPing: 120s, only while the tab is visible
  // and the incident is open. The server independently refuses pings on
  // terminal or >6h-old incidents.
  useEffect(() => {
    if (!live) return

    const tick = () => {
      if (document.visibilityState !== "visible") return
      if (!("geolocation" in navigator)) return
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void pingIncidentLocation(
            getToken,
            incidentId,
            position.coords.latitude,
            position.coords.longitude,
          ).catch(() => undefined)
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
      )
    }

    tick()
    const timer = setInterval(tick, PING_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [live, incidentId, getToken])

  const replyMutation = useMutation({
    mutationFn: () => replyToIncident(getToken, incidentId, reply.trim()),
    onSuccess: () => {
      setReply("")
      void queryClient.invalidateQueries({ queryKey: ["sos", incidentId] })
    },
    onError: () => toast.error("Couldn't send that message. Try again."),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelIncident(getToken, incidentId),
    onSuccess: () => {
      toast.success("Report cancelled.")
      void queryClient.invalidateQueries({ queryKey: ["sos", incidentId] })
    },
    onError: () => toast.error("Couldn't cancel the report. Try again."),
  })

  if (incidentQuery.isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm font-medium">We couldn&apos;t load this report.</p>
        <p className="text-muted-foreground text-sm">
          Refresh to retry, or file a new one from the SOS button.
        </p>
      </div>
    )
  }

  const statusLine =
    incident.status === "cancelled"
      ? "You cancelled this report."
      : incident.status === "resolved"
        ? "This report has been resolved."
        : incident.acknowledged_at
          ? `Ops acknowledged ${relativeTime(incident.acknowledged_at)}`
          : "Sent. Waiting for someone to pick this up…"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className={cn(live && "border-destructive/40 bg-destructive/5")}>
        <CardContent className="flex flex-col gap-1.5 pt-6">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {formatLabel(incident.type)}
          </p>
          <p className="flex items-center gap-2 text-base font-semibold">
            {live ? <Siren className="text-destructive size-4" aria-hidden /> : null}
            {statusLine}
          </p>
          <p className="text-muted-foreground text-xs">
            Filed {relativeTime(incident.created_at)}
            {incident.photo_count > 0 ? ` · ${incident.photo_count} photo(s)` : ""}
            {uploading > 0 ? ` · uploading ${uploading}…` : ""}
          </p>
          {incident.reported_lat === null ? (
            <p className="text-muted-foreground text-xs">
              Location wasn&apos;t available — tell us where you are in a message below.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Updates</h2>
        {incident.updates.length === 0 ? (
          <p className="text-muted-foreground text-sm">No updates yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {incident.updates.map((update) => (
              <li
                key={update.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  update.author_type === "system"
                    ? "bg-muted text-muted-foreground mx-auto text-center text-xs"
                    : update.author_type === "driver"
                      ? "bg-primary text-primary-foreground ml-auto max-w-[85%]"
                      : "bg-card mr-auto max-w-[85%] border",
                )}
              >
                <p>{update.body}</p>
                {update.author_type !== "system" ? (
                  <p className="mt-1 text-[11px] opacity-70">
                    {relativeTime(update.created_at)}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>

      {live ? (
        <>
          <div className="flex items-end gap-2">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Add detail for the team…"
              rows={2}
              maxLength={4000}
              className="flex-1"
            />
            <Button
              size="icon"
              aria-label="Send message"
              disabled={!reply.trim() || replyMutation.isPending}
              onClick={() => replyMutation.mutate()}
            >
              <Send className="size-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            This was a false alarm — cancel
          </Button>
        </>
      ) : incident.resolution ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium">How it was resolved</p>
            <p className="text-muted-foreground mt-1 text-sm">{incident.resolution}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
