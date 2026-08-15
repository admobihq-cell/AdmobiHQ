import { Skeleton } from "@workspace/ui/components/skeleton"

import { ChatThreadSkeleton } from "@/components/skeletons/chat-thread-skeleton"

export default function SupportThreadLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <Skeleton className="h-4 w-32" />
      <ChatThreadSkeleton />
    </div>
  )
}
