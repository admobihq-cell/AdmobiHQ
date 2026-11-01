"use client"

import { useAuth } from "@clerk/nextjs"

import { useEffect, useState } from "react"
import {
  CircleCheck,
  EllipsisVertical,
  FileImage,
  FileVideo,
  Grid2X2,
  List,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react"
import {
  MEDIA_ASSET_NAME_MAX,
  checkCreativeForFormat,
  formatBytes,
  formatRelativeTime,
  type CampaignFormat,
  type MediaAssetDto,
} from "@workspace/ops-contracts"

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
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { BlobPreview } from "@/components/media/blob-preview"
import { fetchMediaBlob, type MediaFilter, type MediaSort } from "@/lib/media-client"
import { useDeleteMedia, useMedia, useRenameMedia } from "@/lib/use-media"
import { useOrgPermissions } from "@/lib/use-org"

export type MediaView = "grid" | "list"

const FILTERS: { value: MediaFilter; label: string; heading: string }[] = [
  { value: "all", label: "All files", heading: "All files" },
  { value: "image", label: "Images", heading: "Images" },
  { value: "video", label: "Videos", heading: "Videos" },
  { value: "used", label: "Used", heading: "Used in campaigns" },
  { value: "unused", label: "Unused", heading: "Not used yet" },
]

const SORTS: { value: MediaSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name" },
  { value: "size", label: "File size" },
]

/** Present when the grid is a picker for one campaign's creative step. */
export type MediaSelection = {
  /** The campaign's panel format — drives each file's fit badge. */
  format: CampaignFormat
  /** Files already on the campaign. */
  attachedAssetIds: number[]
  /** File currently being attached, so its button can show progress. */
  pendingAssetId: number | null
  onSelect: (asset: MediaAssetDto) => void
}

/** "PNG", "JPG", "MP4" — what an advertiser calls the file, not its mime type. */
function typeLabel(asset: MediaAssetDto): string {
  const subtype = asset.content_type.split("/")[1] ?? asset.resource_type
  return (subtype === "jpeg" ? "jpg" : subtype).toUpperCase()
}

function specLine(asset: MediaAssetDto): string {
  const parts: string[] = []
  if (asset.width && asset.height) parts.push(`${asset.width} × ${asset.height}`)
  if (asset.duration_seconds) parts.push(`${Number(asset.duration_seconds).toFixed(1)}s`)
  return parts.join(", ")
}

function usageLabel(asset: MediaAssetDto): string | null {
  const count = asset.campaigns.length
  return count === 0 ? null : `Used in ${count}`
}

function uploadedLine(asset: MediaAssetDto): string {
  const when = formatRelativeTime(asset.created_at).replace(/^(Just now|Yesterday)$/, (word) =>
    word.toLowerCase(),
  )
  return `Uploaded ${when}${asset.created_by_name ? ` by ${asset.created_by_name}` : ""}`
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : name.slice(0, 2)
  return letters.toUpperCase()
}

/** Same rule the API applies on attach, so the badge never promises a file the
 * server will refuse. Unknown dimensions pass, as they do server-side. */
function fitFor(asset: MediaAssetDto, format: CampaignFormat): "ok" | "warn" | "fail" {
  if (asset.width == null || asset.height == null) return "ok"
  return checkCreativeForFormat(format, asset.width, asset.height).level
}

function FitBadge({ fit }: { fit: "ok" | "warn" | "fail" }) {
  if (fit === "ok") {
    return (
      <Badge variant="secondary">
        <CircleCheck aria-hidden />
        Ready for campaign
      </Badge>
    )
  }
  return (
    <Badge variant={fit === "warn" ? "outline" : "destructive"}>
      <TriangleAlert aria-hidden />
      {fit === "warn" ? "May look soft" : "Wrong shape"}
    </Badge>
  )
}

function MediaActions({
  asset,
  onRename,
  onDelete,
}: {
  asset: MediaAssetDto
  onRename: () => void
  onDelete: () => void
}) {
  return (
    // Not modal: a modal menu would still hold the page's pointer lock when
    // Rename or Delete opens its dialog.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Actions for ${asset.name}`}
        >
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={onRename}>
          <Pencil aria-hidden />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MediaCard({
  asset,
  selection,
  actions,
}: {
  asset: MediaAssetDto
  selection?: MediaSelection
  actions: React.ReactNode
}) {
  const { getToken } = useAuth()
  const isVideo = asset.resource_type === "video"
  const fit = selection ? fitFor(asset, selection.format) : null
  const alreadyAdded = selection?.attachedAssetIds.includes(asset.id) ?? false
  const usage = usageLabel(asset)
  const spec = specLine(asset)

  return (
    <Card size="sm">
      <CardContent>
        <div className="relative flex h-40 flex-col gap-2 rounded-lg bg-muted/50 p-3">
          <div className="min-h-0 flex-1">
            <BlobPreview
              queryKey={["media-asset-blob", asset.id]}
              load={() => fetchMediaBlob(getToken, asset.id)}
              isVideo={isVideo}
              alt={asset.name}
              lazy={isVideo}
              className="h-full"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
            <span className="flex min-w-0 gap-2">
              <span>{typeLabel(asset)}</span>
              {spec ? <span className="truncate">{spec}</span> : null}
            </span>
            <span className="shrink-0">{formatBytes(asset.size_bytes)}</span>
          </div>
          {usage ? (
            // Lets a click on that corner of the image still open the preview.
            <Badge variant="secondary" className="pointer-events-none absolute top-2 right-2">
              {usage}
            </Badge>
          ) : null}
        </div>
      </CardContent>

      <CardHeader>
        <CardTitle className="min-w-0 truncate" title={asset.name}>
          {asset.name}
        </CardTitle>
        <CardDescription className="min-w-0 truncate">{uploadedLine(asset)}</CardDescription>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>

      {selection && fit ? (
        <CardContent className="mt-auto flex flex-col items-start gap-2">
          <FitBadge fit={fit} />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={fit === "fail" || alreadyAdded || selection.pendingAssetId != null}
            loading={selection.pendingAssetId === asset.id}
            onClick={() => selection.onSelect(asset)}
          >
            {alreadyAdded ? "Already added" : "Use this file"}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  )
}

function MediaTable({
  assets,
  actionsFor,
}: {
  assets: MediaAssetDto[]
  actionsFor: (asset: MediaAssetDto) => React.ReactNode
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-0">Name</TableHead>
          <TableHead className="hidden md:table-cell">Uploaded by</TableHead>
          <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
          <TableHead className="hidden xl:table-cell">Dimensions</TableHead>
          <TableHead className="hidden sm:table-cell">Size</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => {
          const FileIcon = asset.resource_type === "video" ? FileVideo : FileImage
          const usage = usageLabel(asset)
          return (
            <TableRow key={asset.id}>
              <TableCell className="pl-0">
                <div className="flex min-w-0 items-center gap-3">
                  <FileIcon
                    className="size-5 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="max-w-72 truncate font-medium" title={asset.name}>
                    {asset.name}
                  </span>
                  {usage ? (
                    <Badge variant="outline" className="hidden xl:inline-flex">
                      {usage}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {asset.created_by_name ? (
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(asset.created_by_name)}</AvatarFallback>
                    </Avatar>
                    <span>{asset.created_by_name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatRelativeTime(asset.created_at)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums xl:table-cell">
                {specLine(asset) || "Unknown"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                {formatBytes(asset.size_bytes)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">{actionsFor(asset)}</div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: MediaView
  onChange: (view: MediaView) => void
}) {
  const options = [
    { value: "grid" as const, label: "Grid view", icon: Grid2X2 },
    { value: "list" as const, label: "List view", icon: List },
  ]

  return (
    <div
      role="group"
      aria-label="File layout"
      className="inline-flex shrink-0 divide-x divide-border overflow-hidden rounded-lg border border-border"
    >
      {options.map((option) => {
        const active = view === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 px-2.5 text-[0.8rem] font-medium transition-colors focus-visible:relative focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The Media Library. One component, two uses: the full Media page (no
 * `selection`: grid or list, with rename and delete) and the campaign wizard's
 * picker (`selection`: always a grid, with a fit badge and a "Use this file"
 * button per file).
 */
export function MediaGrid({
  selection,
  view = "grid",
  onViewChange,
  onUpload,
}: {
  selection?: MediaSelection
  view?: MediaView
  /** Omit to hide the grid/list toggle. */
  onViewChange?: (view: MediaView) => void
  /** Offered from the empty state. */
  onUpload?: () => void
}) {
  const { can } = useOrgPermissions()
  const canWrite = !selection && can("media:write")

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<MediaFilter>("all")
  const [sort, setSort] = useState<MediaSort>("newest")
  const [page, setPage] = useState(1)

  const [renaming, setRenaming] = useState<MediaAssetDto | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleting, setDeleting] = useState<MediaAssetDto | null>(null)

  const rename = useRenameMedia()
  const remove = useDeleteMedia()

  // Wait for a pause in typing before asking the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const mediaQuery = useMedia({ page, search, filter, sort })
  const data = mediaQuery.data
  const filtering = search !== "" || filter !== "all"
  const heading = FILTERS.find((item) => item.value === filter)?.heading
  const gridColumns = selection ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"

  function actionsFor(asset: MediaAssetDto) {
    if (!canWrite) return null
    return (
      <MediaActions
        asset={asset}
        onRename={() => {
          setRenameValue(asset.name)
          setRenaming(asset)
        }}
        onDelete={() => setDeleting(asset)}
      />
    )
  }

  function submitRename() {
    if (!renaming) return
    const name = renameValue.trim()
    if (!name) return
    rename.mutate({ id: renaming.id, name }, { onSuccess: () => setRenaming(null) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full md:max-w-lg">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search files…"
            aria-label="Search files by name"
            className="pl-9"
          />
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-fit shrink-0">
              <SlidersHorizontal data-icon="inline-start" />
              Filter &amp; sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) => {
                  setFilter(value as MediaFilter)
                  setPage(1)
                }}
              >
                {FILTERS.map((item) => (
                  <DropdownMenuRadioItem key={item.value} value={item.value}>
                    {item.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => {
                  setSort(value as MediaSort)
                  setPage(1)
                }}
              >
                {SORTS.map((item) => (
                  <DropdownMenuRadioItem key={item.value} value={item.value}>
                    {item.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="truncate text-lg font-medium">{heading}</h2>
            {data ? (
              <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                {data.total} {data.total === 1 ? "file" : "files"}
              </span>
            ) : null}
          </div>
          {onViewChange ? <ViewToggle view={view} onChange={onViewChange} /> : null}
        </div>

        {mediaQuery.isPending ? (
          view === "list" ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <div className={cn("grid gap-4", gridColumns)}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          )
        ) : mediaQuery.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
            <p className="text-sm font-medium">Couldn&apos;t load your media</p>
            <p className="max-w-sm text-sm text-muted-foreground">{mediaQuery.error.message}</p>
            <Button type="button" variant="outline" onClick={() => void mediaQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
            <p className="text-sm font-medium">
              {filtering ? "Nothing matches" : "Your library is empty"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {filtering
                ? "Try another search or filter."
                : "Upload a creative once and reuse it on any campaign."}
            </p>
            {!filtering && onUpload ? (
              <Button type="button" onClick={onUpload}>
                <Upload data-icon="inline-start" />
                Upload
              </Button>
            ) : null}
          </div>
        ) : view === "list" && !selection ? (
          <MediaTable assets={data.items} actionsFor={actionsFor} />
        ) : (
          <div className={cn("grid gap-4", gridColumns)}>
            {data.items.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                selection={selection}
                actions={actionsFor(asset)}
              />
            ))}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Dialog open={renaming != null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitRename()
            }}
          >
            <Input
              autoFocus
              value={renameValue}
              maxLength={MEDIA_ASSET_NAME_MAX}
              onChange={(event) => setRenameValue(event.target.value)}
              aria-label="File name"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={rename.isPending} disabled={!renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting != null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          {deleting && deleting.campaigns.length > 0 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>This file is in use</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{deleting.name}&rdquo; is used by{" "}
                  {deleting.campaigns.map((campaign) => campaign.name).join(", ")}. Remove it from{" "}
                  {deleting.campaigns.length === 1 ? "that campaign" : "those campaigns"} before
                  deleting it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{deleting?.name}&rdquo; will be removed from your library for everyone in
                  your organization. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    if (deleting) remove.mutate(deleting.id)
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
