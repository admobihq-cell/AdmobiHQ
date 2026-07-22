import { Skeleton } from "@workspace/ui/components/skeleton"

type AppPageSkeletonProps = {
  title?: string
}

/** Inline content-area skeleton — app shell (sidebar) stays visible. */
export function AppPageSkeleton({ title = "Loading…" }: AppPageSkeletonProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-dashed bg-muted/20 p-12 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Coming soon
      </p>
      <h1 className="text-xl font-semibold">{title}</h1>
      <Skeleton className="mx-auto h-4 w-full max-w-md" />
    </div>
  )
}
