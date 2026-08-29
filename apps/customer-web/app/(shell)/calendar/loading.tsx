import { Skeleton } from "@workspace/ui/components/skeleton"

export default function CampaignCalendarLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-7 w-36" />
        <Skeleton className="size-7 rounded-lg" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="min-h-[32rem] rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
