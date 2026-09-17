"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import {
  ACK_TARGET_SECONDS,
  SAFETY_TERMINAL_STATUSES,
  formatDateTime,
  formatLabel,
  type SafetyIncidentDetailDto,
} from "@workspace/ops-contracts"
import { formatApiError } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { ImageLightbox } from "@workspace/ui/components/image-lightbox"

import { IncidentTypeIcon } from "@/components/incident-type-icon"
import { StatusBadge } from "@/components/status-badge"
import { useOpsClient } from "@/lib/ops-client"

const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)

/**
 * Same authenticated blob fetch as the driver-application document preview:
 * the file route streams bytes behind an ops bearer token, so pointing an
 * image element straight at that URL would 401. Fetch with the token, turn
 * the response into an object URL, and revoke it on unmount.
 */
function IncidentPhoto({
  incidentId,
  photoId,
  index,
}: {
  incidentId: number
  photoId: number
  index: number
}) {
  const client = useOpsClient()
  const { getToken } = useAuth()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setFailed(false)

    async function load() {
      try {
        const token = await getToken()
        const res = await fetch(client.safety.photoFileUrl(incidentId, photoId), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: AbortSignal.timeout(15000),
        })
        if (cancelled) return
        if (!res.ok) {
          setFailed(true)
          return
        }
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setUrl(objectUrl)
      } catch (error) {
        console.error("[IncidentPhoto] failed to load photo:", error)
        if (!cancelled) setFailed(true)
      }
    }
    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [incidentId, photoId, getToken, client, attempt])

  const label = `Incident photo ${index + 1}`

  if (url) {
    return (
      <ImageLightbox src={url} alt={label}>
        <img
          src={url}
          alt={label}
          className="h-32 w-full rounded-lg border border-border object-cover"
        />
      </ImageLightbox>
    )
  }

  if (failed) {
    return (
      <button
        type="button"
        onClick={() => setAttempt((n) => n + 1)}
        className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
      >
        <span>Couldn&apos;t load</span>
        <span className="font-medium text-foreground">Retry</span>
      </button>
    )
  }

  return <Skeleton className="h-32 w-full rounded-lg" />
}

function ackSummary(incident: SafetyIncidentDetailDto): string {
  if (!incident.acknowledged_at) {
    const seconds = Math.floor((Date.now() - new Date(incident.created_at).getTime()) / 1000)
    const late = seconds > ACK_TARGET_SECONDS
    return late
      ? `Unacknowledged for ${Math.floor(seconds / 60)} minutes`
      : "Not yet acknowledged"
  }
  return `Acknowledged by ${incident.acknowledged_by_email ?? "ops"} · ${formatDateTime(
    incident.acknowledged_at,
  )}`
}

export function SosDetailView({ incidentId }: { incidentId: number }) {
  const client = useOpsClient()
  const queryClient = useQueryClient()

  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [resolution, setResolution] = useState("")
  const [resolving, setResolving] = useState(false)

  const incidentQuery = useQuery({
    queryKey: ["ops-sos", incidentId],
    queryFn: () => client.safety.get(incidentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL.has(status) ? false : 15_000
    },
  })

  const incident = incidentQuery.data

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ops-sos"] })
  }

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof client.safety.update>[1]) =>
      client.safety.update(incidentId, body),
    onSuccess: (_data, body) => {
      invalidate()
      setResolving(false)
      setResolution("")
      toast.success(
        body.status === "resolved" ? "Incident resolved" : "Incident updated",
      )
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  const replyMutation = useMutation({
    mutationFn: () => client.safety.reply(incidentId, { body: reply.trim(), internal_note: internalNote }),
    onSuccess: () => {
      setReply("")
      setInternalNote(false)
      invalidate()
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  if (incidentQuery.isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (incidentQuery.isError || !incident) {
    return (
      <ApiErrorBanner
        message={formatApiError(incidentQuery.error)}
        onRetry={() => void incidentQuery.refetch()}
      />
    )
  }

  const lat = incident.last_lat ?? incident.reported_lat
  const lng = incident.last_lng ?? incident.reported_lng
  const mapsHref = lat !== null && lng !== null ? `https://www.google.com/maps?q=${lat},${lng}` : null
  const live = !TERMINAL.has(incident.status)
  const whatsappHref = incident.driver_phone
    ? `https://wa.me/${incident.driver_phone.replace(/[^\d]/g, "")}`
    : null

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sos">
            <ArrowLeft className="size-4" />
            All incidents
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <IncidentTypeIcon type={incident.type} className="size-5" />
          <h1 className="text-lg font-semibold">
            {formatLabel(incident.type)} · #{incident.id}
          </h1>
        </div>
        <StatusBadge status={incident.status} />
        <Badge variant="outline">{formatLabel(incident.severity)}</Badge>
      </div>

      <div
        className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          incident.acknowledged_at
            ? "border-border bg-muted/40 text-muted-foreground"
            : "border-destructive/40 bg-destructive/10 font-medium text-destructive",
        )}
      >
        {ackSummary(incident)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What the driver reported</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">
                {incident.description || "No description given — call them."}
              </p>
              <p className="text-xs text-muted-foreground">
                Filed {formatDateTime(incident.created_at)}
              </p>

              {incident.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {incident.photos.map((photo, index) => (
                    <IncidentPhoto
                      key={photo.id}
                      incidentId={incident.id}
                      photoId={photo.id}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No photos attached.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incident.updates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                <ol className="space-y-3">
                  {incident.updates.map((update) => (
                    <li
                      key={update.id}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm",
                        update.author_type === "system" &&
                          "border-transparent bg-muted/50 text-xs text-muted-foreground",
                        update.internal_note &&
                          "border-amber-500/40 bg-amber-500/5",
                      )}
                    >
                      {update.author_type !== "system" ? (
                        <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {update.author_type === "driver"
                              ? incident.driver_name ?? "Driver"
                              : update.author_email ?? "Ops"}
                          </span>
                          {update.internal_note ? (
                            <Badge variant="outline" className="text-[10px]">
                              Internal — not shown to the driver
                            </Badge>
                          ) : null}
                          <span>{formatDateTime(update.created_at)}</span>
                        </p>
                      ) : null}
                      <p>{update.body}</p>
                    </li>
                  ))}
                </ol>
              )}

              <div className="space-y-2 border-t pt-4">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to the driver…"
                  rows={3}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={internalNote}
                      onCheckedChange={(v) => setInternalNote(v === true)}
                    />
                    Internal note — the driver won&apos;t see this
                  </label>
                  <Button
                    size="sm"
                    disabled={!reply.trim() || replyMutation.isPending}
                    loading={replyMutation.isPending}
                    onClick={() => replyMutation.mutate()}
                  >
                    <MessageSquare className="size-4" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{incident.driver_name ?? "Unnamed driver"}</p>
              {incident.driver_phone ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <a href={`tel:${incident.driver_phone}`}>
                      <Phone className="size-4" />
                      Call {incident.driver_phone}
                    </a>
                  </Button>
                  {whatsappHref ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                        WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No number on file — reply in the thread instead.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mapsHref ? (
                <>
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                      <MapPin className="size-4" />
                      Open in Google Maps
                    </a>
                  </Button>
                  <p className="font-mono text-xs text-muted-foreground">
                    {lat?.toFixed(5)}, {lng?.toFixed(5)}
                    {incident.reported_accuracy_m ? ` ±${incident.reported_accuracy_m}m` : ""}
                  </p>
                  {incident.last_location_at ? (
                    <p className="text-xs text-muted-foreground">
                      Position updated {formatDateTime(incident.last_location_at)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Position as reported. Live updates only arrive while the driver has the app
                      open.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No location — the device had no fix. Ask the driver where they are.
                </p>
              )}
            </CardContent>
          </Card>

          {live ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!incident.acknowledged_at ? (
                  <Button
                    className="w-full"
                    loading={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: "acknowledged" })}
                  >
                    <Check className="size-4" />
                    Acknowledge
                  </Button>
                ) : null}

                {incident.status !== "in_progress" ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    loading={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: "in_progress" })}
                  >
                    Mark in progress
                  </Button>
                ) : null}

                {resolving ? (
                  <div className="space-y-2">
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="What happened and how it was handled — the driver sees this."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        // The API rejects an empty note with a 400; validating
                        // here keeps that from surfacing as a red error toast.
                        disabled={!resolution.trim() || updateMutation.isPending}
                        loading={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            status: "resolved",
                            resolution: resolution.trim(),
                          })
                        }
                      >
                        <ShieldCheck className="size-4" />
                        Resolve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setResolving(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setResolving(true)}>
                    <ShieldCheck className="size-4" />
                    Resolve…
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : incident.resolution ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm">{incident.resolution}</p>
                <p className="text-xs text-muted-foreground">
                  {incident.resolved_by_email} · {formatDateTime(incident.resolved_at)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
