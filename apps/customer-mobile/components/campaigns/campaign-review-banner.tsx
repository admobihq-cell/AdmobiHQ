import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"
import type { CampaignDto } from "@workspace/ops-contracts"

import { Time, Warning } from "@/components/icons"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

/**
 * The advertiser's view of ops's decision. The review reason is rendered
 * verbatim, because paraphrasing it would leave the app disagreeing with the
 * email that carried the same text. RN counterpart of
 * apps/customer-web/components/campaigns/campaign-review-banner.tsx.
 */
export function CampaignReviewBanner({ campaign }: { campaign: CampaignDto }) {
  const router = useRouter()
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    banner: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    queued: { borderColor: c.primary, backgroundColor: `${c.primary}12` },
    blocked: { borderColor: c.danger, backgroundColor: `${c.danger}14` },
    body: { flex: 1, gap: spacing.xs },
    titleQueued: { ...typography.label, color: c.text, fontWeight: "700" as const },
    titleBlocked: { ...typography.label, color: c.danger, fontWeight: "700" as const },
    copyQueued: { ...typography.bodySm, color: c.mutedForeground },
    copyBlocked: { ...typography.bodySm, color: c.danger },
    editButton: {
      alignSelf: "flex-start" as const,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.danger,
    },
    editText: { ...typography.label, color: c.danger, fontWeight: "600" as const },
  }))

  if (campaign.status === "submitted") {
    return (
      <View style={[styles.banner, styles.queued]}>
        <Time color={colors.primary} size={16} />
        <View style={styles.body}>
          <Text style={styles.titleQueued}>In queue for review</Text>
          <Text style={styles.copyQueued}>
            We&apos;re checking your brief, flight window, and creative — this usually takes a
            day or two. You can&apos;t edit a campaign while it&apos;s under review.
          </Text>
        </View>
      </View>
    )
  }

  if (campaign.status !== "rejected" && campaign.status !== "changes_requested") {
    return null
  }

  const rejected = campaign.status === "rejected"

  return (
    <View style={[styles.banner, styles.blocked]}>
      <Warning color={colors.danger} size={16} />
      <View style={styles.body}>
        <Text style={styles.titleBlocked}>
          {rejected ? "Why it wasn't approved" : "What needs to change"}
        </Text>
        <Text style={styles.copyBlocked}>
          {campaign.review_reason ??
            "Our team asked for changes before this can be approved."}
        </Text>
        <Pressable
          style={styles.editButton}
              onPress={() =>
                router.push({ pathname: "/campaigns/new", params: { id: String(campaign.id) } })
              }
          accessibilityRole="button"
        >
          <Text style={styles.editText}>Edit and resubmit</Text>
        </Pressable>
      </View>
    </View>
  )
}
