import { NewCampaignSkeleton } from "@/components/campaigns/new-campaign-chrome"

/** Without this the route inherits `campaigns/loading.tsx` — the campaign
 * *list* skeleton, rendered inside the app shell — and then snaps to the
 * wizard's full-screen overlay. Same chrome here, so nothing moves. */
export default function NewCampaignLoading() {
  return <NewCampaignSkeleton />
}
