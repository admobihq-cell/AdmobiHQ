import { ChevronRight } from "@/components/icons"
import * as Haptics from "expo-haptics"
import { Platform, Pressable, Text, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type ListRowProps = {
  title: string
  subtitle?: string
  meta?: string
  initials?: string
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

export function AvatarInitials({ name }: { name: string }) {
  const styles = useThemedStyles((c) => ({
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: {
      ...typography.caption,
      fontWeight: "700" as const,
      color: c.primary,
    },
  }))

  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  )
}

export function ListRow({
  title,
  subtitle,
  meta,
  initials,
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
