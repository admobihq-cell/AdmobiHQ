import { useAuth, useUser } from "@clerk/clerk-expo"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { GroupedList, GroupedSection } from "@/components/app/grouped-list"
import { LargeTitleScreen } from "@/components/app/large-title-screen"
import { ListRow } from "@/components/app/list-row"
import { getPrimaryEmail } from "@/lib/auth"
import { useOpsClient } from "@/lib/ops-client"
import { spacing } from "@/lib/theme"

export default function MoreScreen() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { user } = useUser()
  const client = useOpsClient()
  const email = getPrimaryEmail(
    user?.emailAddresses,
    user?.primaryEmailAddressId,
  )

  const [counts, setCounts] = useState<{ waitlist: number; mediaKit: number }>({
    waitlist: 0,
    mediaKit: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchCounts() {
      try {
        const stats = await client.stats.get({ range: "all" as DateRangeKey })
        if (!cancelled) {
          setCounts({
            waitlist: stats.overview.totals.waitlist,
            mediaKit: stats.overview.totals.mediaKit,
          })
        }
      } catch {
        // Counts are optional on this screen
      }
    }

    void fetchCounts()
    return () => {
      cancelled = true
    }
  }, [client])

  const version = Constants.expoConfig?.version ?? "0.0.1"

  return (
    <LargeTitleScreen title="More">
      <View style={styles.content}>
        <GroupedSection title="Account">
          <GroupedList>
            <ListRow
              title={email ?? "Signed in"}
              subtitle="Admobi Ops staff"
              showChevron={false}
            />
            <ListRow
              title="Sign out"
              onPress={() => void signOut()}
              showChevron={false}
              destructive
            />
          </GroupedList>
        </GroupedSection>

        <GroupedSection title="Modules">
          <GroupedList>
            <ListRow
              title="Waitlist"
              subtitle={`${counts.waitlist} entries`}
              onPress={() => router.push("/(ops)/waitlist")}
            />
            <ListRow
              title="Media kit"
              subtitle={`${counts.mediaKit} requests`}
              onPress={() => router.push("/(ops)/media-kit")}
            />
          </GroupedList>
        </GroupedSection>

        <GroupedSection title="App">
          <GroupedList>
            <ListRow
              title="Version"
              subtitle={version}
              showChevron={false}
            />
          </GroupedList>
        </GroupedSection>
      </View>
    </LargeTitleScreen>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
})
