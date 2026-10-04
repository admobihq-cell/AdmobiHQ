import type {
  SafetyIncident,
  SafetyIncidentPhoto,
  SafetyIncidentUpdate,
} from "@prisma/client"

import {
  SEVERITY_BY_TYPE,
  type SafetyIncidentDetailDto,
  type SafetyIncidentDto,
  type SafetyIncidentPhotoDto,
  type SafetyIncidentType,
  type SafetyIncidentUpdateDto,
  type SafetySeverity,
} from "@workspace/ops-contracts"

/**
 * Pure logic and DTO mapping for driver SOS incidents. Deliberately free of
 * Prisma calls and request handling so every rule here is unit-testable
 * offline — the route files stay thin wrappers around these.
 */

export const MAX_INCIDENT_PHOTOS = 4
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/** Pings stop 6h after the report regardless of status — see pingAdmission. */
export const PING_MAX_INCIDENT_AGE_MS = 6 * 60 * 60 * 1000

const TERMINAL = new Set(["resolved", "cancelled"])

export function severityForType(type: SafetyIncidentType): SafetySeverity {
  return SEVERITY_BY_TYPE[type] ?? "high"
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.has(status)
}

/**
 * Decides whether a location re-ping should be written.
 *
 * The 6h age cap is the important half: the client stops pinging when it sees
 * a terminal status, but a phone that lost connectivity, was left in a drawer,
 * or never reloaded the tracking screen would otherwise ping forever. Neon
 * compute is this platform's main cost driver, so the server refuses rather
 * than trusting the client to stop.
 */
export function pingAdmission(
  incident: { status: string; created_at: Date },
  now: Date = new Date(),
): "accept" | "terminal" | "stale" {
  if (isTerminalStatus(incident.status)) return "terminal"
  if (now.getTime() - incident.created_at.getTime() > PING_MAX_INCIDENT_AGE_MS) return "stale"
  return "accept"
}

export function canAcceptPhoto(
  currentCount: number,
  file: { type: string; size: number },
): { ok: true } | { ok: false; reason: string } {
  if (currentCount >= MAX_INCIDENT_PHOTOS) {
    return { ok: false, reason: `An incident can have at most ${MAX_INCIDENT_PHOTOS} photos` }
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { ok: false, reason: "Photo must be JPEG, PNG, or WebP" }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, reason: "Photo must be under 8MB" }
  }
  return { ok: true }
}

export function toIncidentPhoto(p: SafetyIncidentPhoto): SafetyIncidentPhotoDto {
  return {
    id: p.id,
    content_type: p.content_type,
    created_at: p.created_at.toISOString(),
  }
}

export function toIncidentUpdate(u: SafetyIncidentUpdate): SafetyIncidentUpdateDto {
  return {
    id: u.id,
    author_type: u.author_type as SafetyIncidentUpdateDto["author_type"],
    author_email: u.author_email,
    body: u.body,
    internal_note: u.internal_note,
    created_at: u.created_at.toISOString(),
  }
}

function baseIncident(i: SafetyIncident, photoCount: number): SafetyIncidentDto {
  return {
    id: i.id,
    driver_name: i.driver_name,
    driver_phone: i.driver_phone,
    type: i.type,
    severity: i.severity,
    status: i.status,
    description: i.description,
    reported_lat: i.reported_lat,
    reported_lng: i.reported_lng,
    reported_accuracy_m: i.reported_accuracy_m,
    last_lat: i.last_lat,
    last_lng: i.last_lng,
    last_location_at: i.last_location_at?.toISOString() ?? null,
    acknowledged_at: i.acknowledged_at?.toISOString() ?? null,
    acknowledged_by_email: i.acknowledged_by_email,
    resolved_at: i.resolved_at?.toISOString() ?? null,
    resolved_by_email: i.resolved_by_email,
    resolution: i.resolution,
    photo_count: photoCount,
    created_at: i.created_at.toISOString(),
    updated_at: i.updated_at.toISOString(),
  }
}

export function toOpsIncident(i: SafetyIncident, photoCount: number): SafetyIncidentDto {
  return baseIncident(i, photoCount)
}

/**
 * The driver's view. Internal ops notes are filtered out HERE rather than in
 * the route, so no driver-facing caller can forget to do it.
 */
export function toDriverIncident(
  i: SafetyIncident,
  photos: SafetyIncidentPhoto[],
  updates: SafetyIncidentUpdate[],
): SafetyIncidentDetailDto {
  return {
    ...baseIncident(i, photos.length),
    photos: photos.map(toIncidentPhoto),
    updates: updates.filter((u) => !u.internal_note).map(toIncidentUpdate),
  }
}
