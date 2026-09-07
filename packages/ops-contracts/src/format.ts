export function formatLabel(value: string | null | undefined): string {
  if (!value) return "—"
  return value.replace(/_/g, " ")
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Compact relative time for list rows (phone triage). Falls back to a short date. */
export function formatRelativeTime(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"

  const diffMs = now.getTime() - d.getTime()
  const future = diffMs < 0
  const absMs = Math.abs(diffMs)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (absMs < minute) return "Just now"
  if (absMs < hour) {
    const mins = Math.floor(absMs / minute)
    return future ? `In ${mins}m` : `${mins}m ago`
  }
  if (absMs < day) {
    const hours = Math.floor(absMs / hour)
    return future ? `In ${hours}h` : `${hours}h ago`
  }
  if (absMs < 7 * day) {
    const days = Math.floor(absMs / day)
    if (days === 1 && !future) return "Yesterday"
    return future ? `In ${days}d` : `${days}d ago`
  }

  return formatDate(d)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

export function truncate(str: string | null | undefined, len = 60): string {
  if (!str) return "—"
  return str.length > len ? `${str.slice(0, len)}…` : str
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function buildListQueryParams(
  params: Record<string, string | number | undefined | null>,
): URLSearchParams {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    searchParams.set(key, String(value))
  }
  return searchParams
}

/**
 * Turns arbitrary user text into a filename-safe slug.
 *
 * Restricted to `[a-z0-9-]` on purpose. Beyond looking tidy, that is what makes
 * the result safe to interpolate into a `Content-Disposition` header: a
 * campaign named `foo"; drop.pdf` or one containing a newline cannot break out
 * of the quoted filename, because none of those characters survive.
 *
 * Diacritics are folded (Nairóbi -> nairobi) so a name still reads correctly
 * after stripping. Returns "" when nothing survives — e.g. a name that is
 * entirely emoji or non-Latin script — and callers omit the segment.
 */
export function slugifyForFilename(value: string | null | undefined, maxLength = 60): string {
  if (!value) return ""
  return value
    .normalize("NFKD")
    // Combining marks left behind by NFKD — strip so "é" becomes "e", not "e´".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "")
}

/**
 * Builds a download filename that a person can recognise in their Downloads
 * folder a week later.
 *
 * `exportFileName("proof of play", "Nairobi Launch", "pdf")`
 *   -> `proof-of-play-nairobi-launch-2026-09-06.pdf`
 *
 * The date is always appended: without it every export of the same campaign
 * collides and the browser silently renames to "(1)", "(2)", which is worse
 * than useless when the files are evidence of delivery.
 *
 * `subject` is optional so list-level exports ("all drivers") can use the same
 * helper and simply come out as `drivers-2026-09-06.csv`.
 */
export function exportFileName(
  kind: string,
  subject: string | null | undefined,
  extension: string,
  date: Date = new Date(),
): string {
  const parts = [slugifyForFilename(kind), slugifyForFilename(subject)].filter(Boolean)
  // Local date, not toISOString(): a Nairobi user exporting at 01:00 EAT should
  // see today's date, not yesterday's UTC one.
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")

  return `${[...parts, stamp].join("-")}.${extension.replace(/^\.+/, "")}`
}
