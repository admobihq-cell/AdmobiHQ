import { Pressable, RefreshControl, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { GroupedList } from "@/components/app/grouped-list"
import { ListRow } from "@/components/app/list-row"
import { SkeletonListRows } from "@/components/app/skeleton"
import { Plus, ShieldCheck } from "@/components/icons"
import { TeamTabs } from "@/components/team/team-tabs"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { EmptyState } from "@/components/ui"
import { PageHero } from "@/components/ui/page-hero"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { usePageHeader } from "@/lib/page-header"
import { radius, spacing, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function RolesScreen() {
  usePageHeader("Roles")
  const router = useRouter()
  const client = useOpsClient()
  const colors = useThemeColors()

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => client.roles.list() })
  const roles = rolesQuery.data?.items ?? []
  const error = rolesQuery.error ? formatOpsError(rolesQuery.error, API_URL) : null

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  }))

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={rolesQuery.isRefetching}
            onRefresh={() => void rolesQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <PageHero
          icon={ShieldCheck}
          title="Roles"
          description="Create roles and choose what each can access."
          trailing={
            <Pressable
              style={styles.addButton}
              onPress={() => router.push("/(ops)/team/roles/new")}
              accessibilityLabel="Add role"
            >
              <Plus color={colors.primaryForeground} size={22} strokeWidth={2.5} />
            </Pressable>
          }
        />
        <TeamTabs active="roles" />

        {error ? (
          <ApiErrorBanner message={error} onRetry={() => void rolesQuery.refetch()} />
        ) : rolesQuery.isPending ? (
          <SkeletonListRows count={4} />
        ) : roles.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No roles yet"
            description="Create a role to invite non-admin teammates with scoped access."
          />
        ) : (
          <GroupedList>
            {roles.map((role) => (
              <ListRow
                key={role.id}
                title={role.name}
                subtitle={`${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"} · ${role.memberCount} member${role.memberCount === 1 ? "" : "s"}`}
                onPress={() => router.push(`/(ops)/team/roles/${role.id}`)}
              />
            ))}
          </GroupedList>
        )}
      </ScrollView>
    </View>
  )
}
