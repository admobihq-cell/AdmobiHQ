import { Pressable, Text, View } from "react-native"
import { useRouter } from "expo-router"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

type TeamTab = "members" | "roles"

/** Segmented Members/Roles switcher — mirrors apps/ops/components/team-tabs.tsx on web. */
export function TeamTabs({ active }: { active: TeamTab }) {
  const router = useRouter()
  const styles = useThemedStyles((c) => ({
    root: {
      flexDirection: "row" as const,
      backgroundColor: c.muted,
      borderRadius: radius.md,
      padding: 3,
      marginBottom: spacing.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: radius.sm,
      alignItems: "center" as const,
    },
    tabActive: {
      backgroundColor: c.surface,
    },
    tabText: {
      ...typography.label,
      color: c.mutedForeground,
    },
    tabTextActive: {
      color: c.text,
      fontWeight: "700" as const,
    },
  }))

  return (
    <View style={styles.root}>
      <Pressable
        style={[styles.tab, active === "members" && styles.tabActive]}
        onPress={() => active !== "members" && router.replace("/(ops)/team")}
      >
        <Text style={[styles.tabText, active === "members" && styles.tabTextActive]}>
          Members
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, active === "roles" && styles.tabActive]}
        onPress={() => active !== "roles" && router.replace("/(ops)/team/roles")}
      >
        <Text style={[styles.tabText, active === "roles" && styles.tabTextActive]}>
          Roles
        </Text>
      </Pressable>
    </View>
  )
}
