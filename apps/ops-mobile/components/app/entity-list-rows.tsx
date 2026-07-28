import { ChevronRight } from "@/components/icons"
import * as Haptics from "expo-haptics"
import { Platform, Pressable, Text, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import {
  formatLabel,
  formatRelativeTime,
  type DriverDto,
  type FleetPartnerDto,
  type LeadDto,
} from "@workspace/ops-contracts"

import {
  StatusChip,
  type StatusChipVariant,
} from "@/components/app/status-chip"
import { typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function joinLabeled(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ")
}

function joinWithOverflow(
  values: string[],
  maxVisible = 2,
): string | undefined {
  const labels = values.map((v) => formatLabel(v)).filter((v) => v !== "—")
  if (labels.length === 0) return undefined
  if (labels.length <= maxVisible) return labels.join(", ")
  return `${labels.slice(0, maxVisible).join(", ")} +${labels.length - maxVisible}`
}

export function leadStatusVariant(
  status: string | null | undefined,
): StatusChipVariant {
  switch (status) {
    case "new":
      return "attention"
    case "contacted":
    case "qualified":
      return "progress"
    case "closed":
      return "muted"
    default:
      return "muted"
  }
}

export function fleetStatusVariant(
  status: string | null | undefined,
): StatusChipVariant {
  switch (status) {
    case "pending":
      return "attention"
    case "verified":
      return "progress"
    case "active":
      return "success"
    default:
      return "muted"
  }
}

export function driverStatusVariant(
  status: string | null | undefined,
): StatusChipVariant {
  return fleetStatusVariant(status)
}

type TriageRowProps = {
  title: string
  subtitle?: string
  meta?: string
  statusLabel?: string
  statusVariant?: StatusChipVariant
  time?: string
  onPress: () => void
}

function TriageRow({
  title,
  subtitle,
  meta,
  statusLabel,
  statusVariant = "muted",
  time,
  onPress,
}: TriageRowProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 64,
    },
    content: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      ...typography.headline,
      fontSize: 16,
      color: c.text,
    },
    subtitle: {
      ...typography.bodySm,
      color: c.mutedForeground,
    },
    meta: {
      ...typography.caption,
      color: c.mutedForeground,
      marginTop: 2,
    },
    trailing: {
      alignItems: "flex-end" as const,
      gap: 6,
      flexShrink: 0,
    },
    time: {
      ...typography.caption,
      color: c.mutedForeground,
    },
    chevronWrap: {
      justifyContent: "center" as const,
    },
  }))
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <AnimatedPressable
      onPress={() => {
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
        onPress()
      }}
      onPressIn={() => {
        scale.value = withTiming(0.98, { duration: 100 })
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 })
      }}
      style={[styles.row, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {statusLabel ? (
          <StatusChip label={statusLabel} variant={statusVariant} />
        ) : null}
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
      <View style={styles.chevronWrap}>
        <ChevronRight color={colors.mutedForeground} size={18} strokeWidth={2} />
      </View>
    </AnimatedPressable>
  )
}

type EntityRowProps<T> = {
  item: T
  onPress: () => void
}

export function LeadListRow({ item, onPress }: EntityRowProps<LeadDto>) {
  const meta = joinLabeled([
    item.budget_range ? formatLabel(item.budget_range) : null,
    joinWithOverflow(item.cities),
    joinWithOverflow(item.ad_formats),
  ])

  return (
    <TriageRow
      title={item.company_name}
      subtitle={item.contact_name || undefined}
      meta={meta || undefined}
      statusLabel={item.status ? formatLabel(item.status) : undefined}
      statusVariant={leadStatusVariant(item.status)}
      time={formatRelativeTime(item.created_at)}
      onPress={onPress}
    />
  )
}

export function FleetListRow({
  item,
  onPress,
}: EntityRowProps<FleetPartnerDto>) {
  const subtitle = joinLabeled([
    item.primary_contact_name || null,
    item.phone || null,
  ])
  const meta = joinLabeled([
    item.city ? formatLabel(item.city) : null,
    item.fleet_size ? formatLabel(item.fleet_size) : null,
    joinWithOverflow(item.fleet_types),
  ])

  return (
    <TriageRow
      title={item.company_name}
      subtitle={subtitle || undefined}
      meta={meta || undefined}
      statusLabel={item.status ? formatLabel(item.status) : undefined}
      statusVariant={fleetStatusVariant(item.status)}
      time={formatRelativeTime(item.created_at)}
      onPress={onPress}
    />
  )
}

export function DriverListRow({ item, onPress }: EntityRowProps<DriverDto>) {
  const meta = joinLabeled([
    item.city ? formatLabel(item.city) : null,
    item.vehicle_type ? formatLabel(item.vehicle_type) : null,
    item.days_per_week ? formatLabel(item.days_per_week) : null,
  ])

  return (
    <TriageRow
      title={item.name}
      subtitle={item.phone || undefined}
      meta={meta || undefined}
      statusLabel={item.status ? formatLabel(item.status) : undefined}
      statusVariant={driverStatusVariant(item.status)}
      time={formatRelativeTime(item.created_at)}
      onPress={onPress}
    />
  )
}
