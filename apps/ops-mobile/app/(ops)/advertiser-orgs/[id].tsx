import { ScrollView, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { formatDateTime, formatLabel } from "@workspace/ops-contracts"

import { ListRow } from "@/components/app/list-row"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

export default function AdvertiserOrgDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const id = Number(params.id)
  const client = useOpsClient()
  const router = useRouter()

  const detailQuery = useQuery({
    queryKey: ["advertiser-orgs", "detail", id],
    queryFn: () => client.advertiserOrgs.get(id),
    enabled: Number.isFinite(id) && id > 0,
  })
  const data = detailQuery.data ?? null
  usePageHeader(data?.name ?? "Organization", {
    showBack: true,
    backHref: "/(ops)/advertiser-orgs",
  })

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
    name: { ...typography.headline, fontSize: 20, color: c.text },
    meta: { ...typography.bodySm, color: c.mutedForeground },
    sectionTitle: { ...typography.section, color: c.text },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      overflow: "hidden" as const,
    },
    empty: { ...typography.bodySm, color: c.mutedForeground, padding: spacing.md },
    activityRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 2,
    },
    activityLabel: { ...typography.bodySm, fontWeight: "600" as const, color: c.text },
    activityMeta: { ...typography.caption, color: c.mutedForeground },
    separator: { height: 1, backgroundColor: c.border, marginLeft: spacing.md },
  }))

  if (detailQuery.error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ApiErrorBanner
            message={formatOpsError(detailQuery.error, API_URL)}
            onRetry={() => void detailQuery.refetch()}
          />
        </View>
      </View>
    )
  }

  if (!data) {
    return <View style={styles.container} />
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.name}>{data.name || "Unnamed organization"}</Text>
        <Text style={styles.meta}>
          {data.memberCount} member{data.memberCount === 1 ? "" : "s"} · {data.campaignCount}{" "}
          campaign{data.campaignCount === 1 ? "" : "s"} · created {formatDateTime(data.createdAt)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Members</Text>
      <View style={styles.card}>
        {data.members.length === 0 ? (
          <Text style={styles.empty}>No active members.</Text>
        ) : (
          data.members.map((member, index) => (
            <View key={member.id}>
              <ListRow
                title={member.name ?? member.email ?? member.clerkUserId}
                subtitle={[member.roleName ?? "Member", member.email].filter(Boolean).join(" · ")}
                meta={formatDateTime(member.joinedAt)}
                initials={member.name ?? member.email ?? "?"}
              />
              {index < data.members.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))
        )}
      </View>

      {data.invitations.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Pending invitations</Text>
          <View style={styles.card}>
            {data.invitations.map((invite, index) => (
              <View key={invite.id}>
                <ListRow
                  title={invite.email}
                  subtitle={invite.roleName ?? "Member"}
                  meta={`Expires ${formatDateTime(invite.expiresAt)}`}
                  initials={invite.email}
                />
                {index < data.invitations.length - 1 ? <View style={styles.separator} /> : null}
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Campaigns</Text>
      <View style={styles.card}>
        {data.campaigns.length === 0 ? (
          <Text style={styles.empty}>No campaigns on this org yet.</Text>
        ) : (
          data.campaigns.map((campaign, index) => (
            <View key={campaign.id}>
              <ListRow
                title={campaign.name}
                subtitle={
                  campaign.createdByName
                    ? `By ${campaign.createdByName}`
                    : (campaign.contactEmail ?? undefined)
                }
                meta={formatLabel(campaign.status)}
                initials={campaign.name}
                onPress={() => router.push(`/(ops)/campaigns/${campaign.id}`)}
              />
              {index < data.campaigns.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Activity</Text>
      <View style={styles.card}>
        {data.activity.length === 0 ? (
          <Text style={styles.empty}>Nothing yet.</Text>
        ) : (
          data.activity.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <Text style={styles.activityLabel}>{item.label}</Text>
              <Text style={styles.activityMeta}>
                {item.actorLabel} · {formatDateTime(item.createdAt)}
              </Text>
              {item.detail ? <Text style={styles.activityMeta}>{item.detail}</Text> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}
