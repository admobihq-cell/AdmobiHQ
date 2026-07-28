import { ChevronRight } from "@/components/icons"
import * as Haptics from "expo-haptics"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import {
  StatusChip,
  type StatusChipVariant,
} from "@/components/app/status-chip"
import { typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type ListRowProps = {
  title: string
  subtitle?: string
  meta?: string
  initials?: string
  statusLabel?: string
  statusVariant?: StatusChipVariant
  onPress?: () => void
  showChevron?: boolean
  rightElement?: React.ReactNode
  destructive?: boolean
}

function getInitials(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

export function AvatarInitials({
  name,
  onPress,
  size = 40,
}: {
  name: string
  onPress?: () => void
  size?: number
}) {
  const styles = useThemedStyles((c) => ({
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: c.accent,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarPressed: {
      opacity: 0.75,
    },
    avatarText: {
      ...typography.caption,
      fontSize: Math.round(size * 0.32),
      fontWeight: "700" as const,
      color: c.primary,
    },
  }))

  const initials = <Text style={styles.avatarText}>{getInitials(name)}</Text>

  if (!onPress) {
    return <View style={styles.avatar}>{initials}</View>
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      hitSlop={8}
      style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
    >
      {initials}
    </Pressable>
  )
}

export function ListRow({
  title,
  subtitle,
  meta,
  initials,
  statusLabel,
  statusVariant = "muted",
  onPress,
  showChevron = !!onPress,
  rightElement,
  destructive = false,
}: ListRowProps) {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 56,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...typography.headline,
      fontSize: 16,
      color: c.text,
    },
    subtitle: {
      ...typography.bodySm,
      color: c.mutedForeground,
      marginTop: 2,
    },
    meta: {
      ...typography.caption,
      color: c.mutedForeground,
      marginTop: 4,
    },
    destructiveText: {
      color: c.destructive,
    },
  }))
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 })
  }

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 })
  }

  const handlePress = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress?.()
  }

  const content = (
    <>
      {initials ? <AvatarInitials name={initials} /> : null}
      <View style={styles.content}>
        <Text
          style={[styles.title, destructive && styles.destructiveText]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {statusLabel ? (
        <StatusChip label={statusLabel} variant={statusVariant} />
      ) : null}
      {rightElement}
      {showChevron && !rightElement ? (
        <ChevronRight color={colors.mutedForeground} size={18} strokeWidth={2} />
      ) : null}
    </>
  )

  if (!onPress) {
    return <View style={styles.row}>{content}</View>
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.row, animatedStyle]}
    >
      {content}
    </AnimatedPressable>
  )
}
