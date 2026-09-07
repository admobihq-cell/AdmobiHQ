"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bike,
  CircleHelp,
  HandHelping,
  HeartPulse,
  Loader2,
  Phone,
  ShieldAlert,
  Siren,
  Trash2,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"

import {
  SAFETY_INCIDENT_TYPES,
  type SafetyIncidentType,
} from "@workspace/ops-contracts"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { useAuthIfEnabled } from "@/lib/auth/use-auth-if-enabled"
import { captureLocation, createIncident } from "@/lib/sos-client"
import { setPendingSosPhotos } from "@/lib/sos-pending-photos"

const MAX_PHOTOS = 4

const TYPES: Array<{ value: SafetyIncidentType; label: string; icon: typeof Siren }> = [
  { value: "accident", label: "Accident", icon: Siren },
  { value: "harassment", label: "Harassment", icon: HandHelping },
  { value: "theft", label: "Theft", icon: ShieldAlert },
  { value: "vehicle_damage", label: "Damage", icon: Wrench },
  { value: "medical", label: "Medical", icon: HeartPulse },
  { value: "breakdown", label: "Breakdown", icon: Bike },
  { value: "other", label: "Something else", icon: CircleHelp },
]

export function SosClient() {
  const router = useRouter()
  const { getToken } = useAuthIfEnabled()

  const [type, setType] = useState<SafetyIncidentType | null>(null)
  const [description, setDescription] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Object URLs must be revoked or the page leaks a blob per selected photo.
  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [photos])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setPhotos((current) => [...current, ...Array.from(list)].slice(0, MAX_PHOTOS))
    if (fileInput.current) fileInput.current.value = ""
  }

  const submit = async () => {
    if (!type || submitting) return
    setSubmitting(true)
    try {
      const location = await captureLocation()
      const incident = await createIncident(getToken, {
        type,
        description: description.trim() || undefined,
        ...location,
      })

      // Photos upload from the tracking page, not here: ops is alerted the
      // moment this returns, and a failed upload must never lose the report.
      setPendingSosPhotos(incident.id, photos)
      router.replace(`/sos/${incident.id}`)
    } catch (error) {
      console.error("[sos] submit failed", error)
      toast.error(
        "We couldn't file your report. Check your connection and try again — or call 999 if this is an emergency.",
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Get help</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Tell us what happened and ops is alerted straight away, with your location if you allow
          it. For anything life-threatening, call 999 first.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* Emergency services first in the DOM — a driver in a real accident should not
            read past a form to get help, and this stacks above everything on a phone. The
            grid coordinates park it beside the form on a desktop rather than pushing the
            form itself below the fold. */}
        <Card className="border-destructive/40 bg-destructive/5 lg:col-start-2 lg:row-start-1">
          <CardContent className="flex flex-col gap-3 pt-6">
            <Button asChild size="lg" variant="destructive" className="w-full">
              <a href="tel:999">
                <Phone className="size-4" />
                Call 999 — police, ambulance, fire
              </a>
            </Button>
            <p className="text-muted-foreground text-xs">
              Admobi is not an emergency service. If someone is hurt or in danger, call 999
              first, then tell us below.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-3">
            <Label>What happened?</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TYPES.map(({ value, label, icon: Icon }) => {
                const selected = type === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setType(value)}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition sm:aspect-auto sm:h-24",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                      selected
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "bg-card hover:bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                )
              })}
            </div>
            {/* SAFETY_INCIDENT_TYPES is the source of truth; this guards against
                the tile list drifting out of sync with the contract. */}
            {TYPES.length !== SAFETY_INCIDENT_TYPES.length ? (
              <p className="text-muted-foreground text-xs">
                Some incident types aren&apos;t listed — choose &quot;Something else&quot;.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sos-description">Anything else? (optional)</Label>
            <Textarea
              id="sos-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where you are, what you need, whether anyone is hurt"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Photos (optional)</Label>
            <p className="text-muted-foreground text-xs">
              Up to {MAX_PHOTOS}. These upload after your report is sent, so help is on the way first.
            </p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, index) => (
                <div key={src} className="relative">
                  <img
                    src={src}
                    alt={`Selected photo ${index + 1}`}
                    className="size-20 rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => setPhotos((c) => c.filter((_, i) => i !== index))}
                    className="bg-destructive absolute -top-1.5 -right-1.5 rounded-full p-1 text-white"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="text-muted-foreground hover:bg-muted flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs"
                >
                  Add
                </button>
              ) : null}
            </div>
            {/* Native file input — no dropzone dependency. Deliberately no
                `capture`: that forces the rear camera and hides the gallery, and
                a driver filing after the fact usually has the photo already. */}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          <Button
            size="lg"
            variant="destructive"
            className="w-full sm:w-fit sm:min-w-64"
            disabled={!type || submitting}
            onClick={() => void submit()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Siren className="size-4" />
            )}
            {submitting ? "Sending…" : "Send SOS"}
          </Button>
        </div>
      </div>
    </div>
  )
}
