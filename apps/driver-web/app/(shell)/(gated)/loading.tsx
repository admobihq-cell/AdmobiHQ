import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeletons"

/** Shell root is the Dashboard page — this is its skeleton, and the fallback for any route without its own. */
export default function ShellLoading() {
  return <DashboardSkeleton />
}
