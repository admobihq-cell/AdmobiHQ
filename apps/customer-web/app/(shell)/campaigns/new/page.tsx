import { NewCampaignScreen } from "@/components/campaigns/new-campaign-screen"

export const metadata = { title: "New campaign" }

/**
 * A real route, not a sheet — creating a campaign is the main thing an
 * advertiser comes here to do, so it gets the whole screen. Being a route also
 * means the calendar can deep-link a pre-picked window, which keeps there from
 * being two different create surfaces to maintain.
 *
 * `?id=` resumes or edits an existing campaign, `?start=`/`?end=` pre-fill a
 * flight window dragged on the calendar.
 */
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; start?: string; end?: string }>
}) {
  const { id, start, end } = await searchParams
  const campaignId = Number(id)

  return (
    <NewCampaignScreen
      campaignId={Number.isFinite(campaignId) && campaignId > 0 ? campaignId : null}
      initialStartsOn={start ?? null}
      initialEndsOn={end ?? null}
    />
  )
}
