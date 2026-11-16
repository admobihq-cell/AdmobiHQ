import { redirect } from "next/navigation"
import { DATE_RANGE_KEYS, type DateRangeKey, type OpsPermission } from "@workspace/ops-contracts"

import { requireOpsPermission } from "@/lib/auth"

/**
 * Opens an ops dashboard page: redirects to /home without `permission`, and reports which other
 * permissions the viewer holds so the page can decide, before it queries, whether money or safety
 * data may load at all. Admins hold everything.
 */
export async function openDashboard(permission: OpsPermission) {
  let access: Awaited<ReturnType<typeof requireOpsPermission>>
  try {
    access = await requireOpsPermission(permission)
  } catch {
    redirect("/home")
  }
  const has = (p: OpsPermission) => access.role === "admin" || access.permissions.includes(p)
  return { access, has }
}

/** Reads `?tab=&range=`, falling back to the first tab and 30 days for anything unknown. */
export function dashboardParams(
  params: { tab?: string; range?: string },
  tabs: readonly { value: string }[]
): { tab: string; range: DateRangeKey } {
  return {
    tab: tabs.some((t) => t.value === params.tab) ? params.tab! : tabs[0]!.value,
    range: (DATE_RANGE_KEYS as readonly string[]).includes(params.range ?? "") ? (params.range as DateRangeKey) : "30d",
  }
}
