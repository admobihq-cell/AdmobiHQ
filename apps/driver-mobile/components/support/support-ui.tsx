import { Text, View } from "react-native"

import {
  Car,
  Construct,
  HelpCircle,
  Megaphone,
  Wallet,
  type AppIcon,
} from "@/components/icons"
import { radius, typography, useThemedStyles } from "@/lib/theme"

export const SUPPORT_CATEGORIES: { value: string; label: string; icon: AppIcon }[] = [
  { value: "driver", label: "Driver", icon: Car },
  { value: "technical", label: "Technical", icon: Construct },
  { value: "billing", label: "Payouts", icon: Wallet },
  { value: "campaign", label: "Campaign", icon: Megaphone },
  { value: "general", label: "General", icon: HelpCircle },
]

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Awaiting you",
  resolved: "Resolved",
  closed: "Closed",
}

/** A declared component (not a resolved reference) so its identity is stable across renders. */
export function CategoryIcon({
  category,
  size = 16,
  color,
}: {
  category: string
  size?: number
  color: string
}) {
  switch (category) {
    case "billing":
      return <Wallet size={size} color={color} />
    case "campaign":
      return <Megaphone size={size} color={color} />
    case "technical":
      return <Construct size={size} color={color} />
    case "driver":
      return <Car size={size} color={color} />
    default:
      return <HelpCircle size={size} color={color} />
  }
}

export function SupportStatusPill({ status }: { status: string }) {
  const styles = useThemedStyles((c) => ({
    pill: {
      alignSelf: "flex-start" as const,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    open: { backgroundColor: `${c.primary}1A` },
    pending: { backgroundColor: c.accentSurface },
    resolved: { backgroundColor: `${c.success}1A` },
    closed: { backgroundColor: c.mutedSurface },
    text: {
      ...typography.caption,
      fontWeight: "700" as const,
    },
    textOpen: { color: c.primary },
    textPending: { color: c.text },
    textResolved: { color: c.success },
    textClosed: { color: c.mutedForeground },
  }))

  const variant =
    status === "open"
      ? { pill: styles.open, text: styles.textOpen }
      : status === "pending"
        ? { pill: styles.pending, text: styles.textPending }
        : status === "resolved"
          ? { pill: styles.resolved, text: styles.textResolved }
          : { pill: styles.closed, text: styles.textClosed }

  return (
    <View style={[styles.pill, variant.pill]}>
      <Text style={[styles.text, variant.text]}>
        {SUPPORT_STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  )
}
