import { Linking, RefreshControl, ScrollView, Text, View } from "react-native"
import { formatBytes, formatDateTime } from "@workspace/ops-contracts"

import { GroupedList } from "@/components/app/grouped-list"
import { ListRow } from "@/components/app/list-row"
import { SkeletonListRows } from "@/components/app/skeleton"
import { FileText, HelpCircle, ImageIcon, Newspaper } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { EmptyState, SecondaryButton } from "@/components/ui"
import { PageHero } from "@/components/ui/page-hero"
import { StatCard } from "@/components/ui/stat-card"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { cmsAdminUrl } from "@/lib/site-urls"
import { usePageHeader } from "@/lib/page-header"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function ContentScreen() {
  usePageHeader("Content")
  const colors = useThemeColors()
  const { stats, loading, error, refetch } = useDashboardStats()
  const content = stats?.content ?? null

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
    statsGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    sectionTitle: { ...typography.section, color: c.text, marginBottom: spacing.sm },
    sectionDescription: { ...typography.bodySm, color: c.mutedForeground, marginTop: -spacing.sm, marginBottom: spacing.sm },
  }))

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
      >
        <PageHero
          icon={Newspaper}
          title="Content"
          description={`Read-only snapshot of blog, help, and media content.`}
        />
        <SecondaryButton label="Open CMS editor" onPress={() => void Linking.openURL(cmsAdminUrl())} />

        {error ? <ApiErrorBanner message={error} onRetry={() => void refetch()} /> : null}

        {loading && !content ? (
          <SkeletonListRows count={3} />
        ) : !content ? (
          <EmptyState
            icon={Newspaper}
            title="CMS stats unavailable"
            description="Check back later or open the CMS editor directly."
          />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                icon={FileText}
                label="Blog posts"
                value={content.blog.total}
                emphasis
              />
              <StatCard
                icon={HelpCircle}
                label="Help articles"
                value={content.help.total}
              />
              <StatCard
                icon={ImageIcon}
                label="Media library"
                value={`${content.media.total} files`}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>Recent drafts</Text>
              <Text style={styles.sectionDescription}>Latest unpublished blog and help content</Text>
              {content.recentDrafts.length === 0 ? (
                <EmptyState icon={FileText} title="No drafts" />
              ) : (
                <GroupedList>
                  {content.recentDrafts.map((draft) => (
                    <ListRow
                      key={`${draft.type}-${draft.id}`}
                      title={draft.title}
                      subtitle={`${draft.type} · ${formatDateTime(draft.updatedAt)}`}
                    />
                  ))}
                </GroupedList>
              )}
            </View>

            <Text style={styles.sectionDescription}>
              {`Blog: ${content.blog.published} published · ${content.blog.draft} draft. Help: ${content.help.published} published · ${content.help.draft} draft. Media: ${formatBytes(content.media.totalSize)}.`}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}
