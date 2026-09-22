import { OpsMapView } from "@/components/maps/ops-map-view"

/** Throwaway route for screenshotting the redesigned map page without an
 * authenticated session — sibling to the (dashboard) route group, so it
 * never calls requireOpsUser(). The wrapper below mirrors OpsShell's real
 * header height + <main> padding so the negative-margin full-bleed escape
 * gets exercised faithfully. Delete before merging. */
export default function PreviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center border-b px-4 text-sm font-medium">
        Shell header (mock)
      </div>
      <main className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col gap-4 p-4 md:p-6">
        <OpsMapView />
      </main>
    </div>
  )
}
