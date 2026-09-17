import { NewRequestSkeleton } from "@/components/support/new-request-chrome"

/** Without this the route inherits `settings/support/loading.tsx` — the case
 * *list* skeleton, inside the app shell — and then snaps to this overlay. */
export default function NewSupportRequestLoading() {
  return <NewRequestSkeleton />
}
