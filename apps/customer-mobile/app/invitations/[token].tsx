import { useEffect, useState } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ActivityIndicator, Pressable, Text, View } from "react-native"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { acceptOrgInvitation, OrgApiError } from "@/lib/org-client"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

type Conflict = {
  currentOrgName: string
  campaignCount: number
  supportCaseCount: number
}

function detachedSummary(conflict: Conflict): string | null {
  const parts = [
    conflict.campaignCount
      ? `${conflict.campaignCount} campaign${conflict.campaignCount === 1 ? "" : "s"}`
      : null,
    conflict.supportCaseCount
      ? `${conflict.supportCaseCount} support case${conflict.supportCaseCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean)
  return parts.length ? parts.join(" and ") : null
}

/**
 * Expo twin of customer-web's /invitations/[token]. Reachable through the
 * universal link on app.admobihq.com (see app.json intentFilters) and through
 * admobihq-app://invitations/<token>.
 */
export default function AcceptInvitationScreen() {
  const { token: rawToken } = useLocalSearchParams<{ token: string }>()
  const token = typeof rawToken === "string" ? rawToken : ""
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const getToken = useTokenGetter()
  const queryClient = useQueryClient()
  const colors = useThemeColors()

  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [attempted, setAttempted] = useState(false)

  const accept = useMutation({
    mutationFn: (options?: { leaveSoleOrg?: boolean }) =>
      acceptOrgInvitation(getToken, token, options),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
      await queryClient.invalidateQueries({ queryKey: ["customer-org-members"] })
      router.replace("/(tabs)/settings/team")
    },
    onError: (err: OrgApiError) => {
      if (err.reason === "solo_org_conflict" && err.currentOrgName) {
        setConflict({
          currentOrgName: err.currentOrgName,
          campaignCount: err.campaignCount ?? 0,
          supportCaseCount: err.supportCaseCount ?? 0,
        })
      } else {
        setError(err.message)
      }
    },
  })

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token || attempted) return
    setAttempted(true)
    accept.mutate(undefined)
  }, [accept, attempted, isLoaded, isSignedIn, token])

  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      padding: spacing.lg,
      gap: spacing.md,
      justifyContent: "center" as const,
    },
    title: { ...typography.title, color: c.text },
    body: { ...typography.body, color: c.mutedForeground },
    warning: { ...typography.body, color: c.destructive },
    button: {
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center" as const,
      backgroundColor: c.primary,
    },
    buttonText: { fontWeight: "700" as const, color: c.primaryForeground },
    secondary: {
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryText: { fontWeight: "700" as const, color: c.text },
  }))

  if (!isLoaded) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!isSignedIn) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Accept invitation</Text>
        <Text style={styles.body}>
          Sign in — or create an account — with the email address this invitation was sent to. We
          match on it before adding you to the team.
        </Text>
        <Pressable style={styles.button} onPress={() => router.push("/sign-up")}>
          <Text style={styles.buttonText}>Create an account</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push("/sign-in")}>
          <Text style={styles.secondaryText}>I already have an account</Text>
        </Pressable>
      </View>
    )
  }

  if (conflict) {
    const detached = detachedSummary(conflict)
    return (
      <View style={styles.root}>
        <Text style={styles.title}>You already have a workspace</Text>
        <Text style={styles.body}>
          You&apos;re the only member of {conflict.currentOrgName}. Leave it to join this invitation
          instead?
        </Text>
        {detached ? (
          <Text style={styles.warning}>
            This permanently detaches {detached} from your account. Contact support first if you
            still need them.
          </Text>
        ) : null}
        <Pressable
          style={styles.button}
          disabled={accept.isPending}
          onPress={() => {
            setConflict(null)
            accept.mutate({ leaveSoleOrg: true })
          }}
        >
          <Text style={styles.buttonText}>
            {accept.isPending ? "Joining…" : `Leave ${conflict.currentOrgName} and join`}
          </Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Couldn&apos;t accept</Text>
        <Text style={styles.warning}>{error}</Text>
        <Pressable style={styles.secondary} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.secondaryText}>Go to dashboard</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.title}>Joining team…</Text>
      <Text style={styles.body}>Accepting your invitation.</Text>
    </View>
  )
}
