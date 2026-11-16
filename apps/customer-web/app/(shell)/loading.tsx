import { OverviewPageSkeleton } from "@/components/skeletons/dashboard-skeletons"

/** Shell root is the Overview page: this is its skeleton, and the fallback for any route without its own. */
export default function ShellLoading() {
  return <OverviewPageSkeleton />
}
