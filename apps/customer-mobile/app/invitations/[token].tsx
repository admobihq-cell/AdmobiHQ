import { useState } from "react"
import { useAuth } from "@clerk/clerk-expo"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native"

import type { AdvertiserInvitationPreviewDto } from "@workspace/ops-contracts"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import {
  acceptOrgInvitation,
  declineOrgInvitation,
  getOrgInvitationPreview,
  OrgApiError,
} from "@/lib/org-client"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

function detachedSummary(preview: AdvertiserInvitationPreviewDto): string | null {
  const parts = [
    preview.campaignCount
      ? `${preview.campaignCount} campaign${preview.campaignCount === 1 ? "" : "s"}`
      : null,
    preview.supportCaseCount
      ? `${preview.supportCaseCount} support case${preview.supportCaseCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean)
  return parts.length ? parts.join(" and ") : null
}

/**
 * Expo twin of customer-web's /invitations/[token]. Joining is never
 * automatic — the invitee sees who invited them and what accepting would cost
 * them, then picks Accept or Decline. Reachable through the universal link on
 * app.admobihq.com and through admobihq-app://invitations/<token>.
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
  const [declined, setDeclined] = useState(false)

  const previewQuery = useQuery({
    queryKey: ["org-invitation-preview", token, isSignedIn],
    queryFn: () => getOrgInvitationPreview(getToken, token),
    enabled: isLoaded && Boolean(token),
    retry: false,
  })

  const accept = useMutation({
    mutationFn: (options?: { leaveSoleOrg?: boolean }) =>
      acceptOrgInvitation(getToken, token, options),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-org"] })
      await queryClient.invalidateQueries({ queryKey: ["customer-org-members"] })
      router.replace("/(tabs)")
    },
    onError: (err: OrgApiError) => setError(err.message),
  })

  const decline = useMutation({
    mutationFn: () => declineOrgInvitation(getToken, token),
    onSuccess: () => setDeclined(true),
    onError: (err: OrgApiError) => setError(err.message),
  })

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1, justifyContent: "center" as const },
    title: { ...typography.title, color: c.text },
    body: { ...typography.body, color: c.mutedForeground },
    strong: { color: c.text, fontWeight: "700" as const },
    warning: { ...typography.body, color: c.destructive },
    button: {
      marginTop: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center" as const,
      backgroundColor: c.primary,
    },
    buttonDanger: { backgroundColor: c.destructive },
    buttonText: { fontWeight: "700" as const, color: c.primaryForeground },
    secondary: {
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryText: { fontWeight: "700" as const, color: c.text },
    disabled: { opacity: 0.6 },
  }))

  if (!isLoaded || previewQuery.isLoading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.title}>This invitation isn&apos;t available</Text>
        <Text style={styles.warning}>
          {(previewQuery.error as OrgApiError | null)?.message ??
            "It may have expired or been withdrawn."}
        </Text>
        <Pressable style={styles.secondary} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.secondaryText}>Go to dashboard</Text>
        </Pressable>
      </ScrollView>
    )
  }

  const preview = previewQuery.data

  if (declined) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Invitation declined</Text>
        <Text style={styles.body}>
          Nothing about your account changed. Ask {preview.inviterName} for a new invitation if you
          change your mind.
        </Text>
        <Pressable style={styles.secondary} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.secondaryText}>Go to dashboard</Text>
        </Pressable>
      </ScrollView>
    )
  }

  const invitedTo = (
    <Text style={styles.body}>
      <Text style={styles.strong}>{preview.inviterName}</Text> invited you to join{" "}
      <Text style={styles.strong}>{preview.orgName}</Text>
      {preview.roleName ? ` as ${preview.roleName}` : ""}, at {preview.email}.
    </Text>
  )

  if (!isSignedIn) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Join {preview.orgName}</Text>
        {invitedTo}
        <Text style={styles.body}>
          Use that address to continue — we match on it before adding you to the team.
        </Text>
        <Pressable style={styles.button} onPress={() => router.push("/sign-up")}>
          <Text style={styles.buttonText}>Create an account</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push("/sign-in")}>
          <Text style={styles.secondaryText}>I already have an account</Text>
        </Pressable>
      </ScrollView>
    )
  }

  if (preview.emailMismatch) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Wrong account</Text>
        {invitedTo}
        <Text style={styles.warning}>
          You&apos;re signed in with a different email address. Sign in as {preview.email} to accept.
        </Text>
        <Pressable style={styles.secondary} onPress={() => router.push("/sign-in")}>
          <Text style={styles.secondaryText}>Switch account</Text>
        </Pressable>
      </ScrollView>
    )
  }

  const busy = accept.isPending || decline.isPending

  if (preview.conflict === "existing_team") {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.title}>You&apos;re already in an organization</Text>
        {invitedTo}
        <Text style={styles.body}>
          You belong to{" "}
          <Text style={styles.strong}>{preview.currentOrgName ?? "another organization"}</Text>,
          which has other members. Leave it from Settings — or transfer admin first, if you&apos;re
          the admin — before joining a different one.
        </Text>
        {error ? <Text style={styles.warning}>{error}</Text> : null}
        <Pressable
          style={styles.secondary}
          onPress={() => router.replace("/(tabs)/settings/account")}
        >
          <Text style={styles.secondaryText}>Go to Settings</Text>
        </Pressable>
        <Pressable
          style={[styles.secondary, busy && styles.disabled]}
          disabled={busy}
          onPress={() => decline.mutate()}
        >
          <Text style={styles.secondaryText}>
            {decline.isPending ? "Declining…" : "Decline invitation"}
          </Text>
        </Pressable>
      </ScrollView>
    )
  }

  const replacesWorkspace =
    preview.conflict === "empty_solo_org" || preview.conflict === "solo_org_with_content"
  const losesWork = preview.conflict === "solo_org_with_content"
  const detached = detachedSummary(preview)

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Join {preview.orgName}?</Text>
      {invitedTo}

      {preview.conflict === "empty_solo_org" ? (
        <Text style={styles.body}>
          Accepting replaces <Text style={styles.strong}>{preview.currentOrgName}</Text> — the empty
          workspace created for you at sign-up. There&apos;s nothing in it.
        </Text>
      ) : null}

      {losesWork ? (
        <Text style={styles.warning}>
          Accepting deletes {preview.currentOrgName}
          {detached ? `, permanently detaching ${detached}` : ""}. That can&apos;t be undone —
          contact support first if you still need them.
        </Text>
      ) : null}

      {error ? <Text style={styles.warning}>{error}</Text> : null}

      <Pressable
        style={[styles.button, losesWork && styles.buttonDanger, busy && styles.disabled]}
        disabled={busy}
        onPress={() => accept.mutate(replacesWorkspace ? { leaveSoleOrg: true } : undefined)}
      >
        <Text style={styles.buttonText}>
          {accept.isPending
            ? "Joining…"
            : losesWork
              ? "Delete workspace and join"
              : "Accept invitation"}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.secondary, busy && styles.disabled]}
        disabled={busy}
        onPress={() => decline.mutate()}
      >
        <Text style={styles.secondaryText}>{decline.isPending ? "Declining…" : "Decline"}</Text>
      </Pressable>
    </ScrollView>
  )
}
