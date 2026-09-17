import { Link, Stack, useLocalSearchParams } from "expo-router"
import { Text, View } from "react-native"

import { SkeletonCampaignCards } from "@/components/app/skeleton"
import { CampaignWizard } from "@/components/campaigns/campaign-wizard"
import { useCampaign } from "@/lib/use-campaigns"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

/** A campaign under review or already approved can't be edited — the API
 * returns 409, so refuse here rather than letting someone fill in a form that
 * can't save. */
const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

/**
 * `?id=` resumes or edits an existing campaign, `?startsOn=`/`?endsOn=`
 * pre-fill a flight window picked on the calendar. Same contract as the web
 * route, so a deep link works on either surface.
 */
export default function NewCampaignScreen() {
  const params = useLocalSearchParams<{ id?: string; startsOn?: string; endsOn?: string }>()
  const parsedId = Number.parseInt(params.id ?? "", 10)
  const campaignId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null

  const campaignQuery = useCampaign(campaignId)
  const campaign = campaignQuery.data ?? null

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    padded: { padding: spacing.lg, gap: spacing.md },
    title: { ...typography.section, color: c.text },
    body: { ...typography.bodySm, color: c.mutedForeground },
    link: {
      alignSelf: "flex-start" as const,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: c.primary,
    },
    linkText: { ...typography.label, color: c.primaryForeground, fontWeight: "700" as const },
  }))

  const screenTitle = campaignId ? "Edit campaign" : "New campaign"

  if (campaignId != null && campaignQuery.isPending) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: screenTitle }} />
        <View style={styles.padded}>
          <SkeletonCampaignCards count={2} />
        </View>
      </View>
    )
  }

  if (campaignId != null && !campaign) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: screenTitle }} />
        <View style={styles.padded}>
          <Text style={styles.title}>Campaign not found</Text>
          <Text style={styles.body}>
            It may have been deleted, or it belongs to another account.
          </Text>
          <Link href="/campaigns" style={styles.link}>
            <Text style={styles.linkText}>Back to campaigns</Text>
          </Link>
        </View>
      </View>
    )
  }

  if (campaign && !EDITABLE_STATUSES.has(campaign.status)) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: screenTitle }} />
        <View style={styles.padded}>
          <Text style={styles.title}>This campaign can&apos;t be edited</Text>
          <Text style={styles.body}>
            {campaign.status === "submitted"
              ? "It's in the queue for review. We'll let you know as soon as there's a decision."
              : "Approved campaigns are locked. Talk to your account manager if something needs to change."}
          </Text>
          <Link href={`/campaigns/${campaign.id}`} style={styles.link}>
            <Text style={styles.linkText}>View campaign</Text>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: screenTitle }} />
      <CampaignWizard
        initialCampaign={campaign}
        initialStartsOn={typeof params.startsOn === "string" ? params.startsOn : null}
        initialEndsOn={typeof params.endsOn === "string" ? params.endsOn : null}
      />
    </View>
  )
}
