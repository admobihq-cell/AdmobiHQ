import { Image, Text, View } from "react-native"

import { Person } from "@/components/icons"
import { useThemeColors, useThemedStyles } from "@/lib/theme"

type UserAvatarProps = {
  imageUrl?: string | null
  name?: string | null
  size?: number
  /** Use the primary accent as the ring color instead of the surface border — for placement on a colored hero. */
  onPrimary?: boolean
}

function getInitials(name?: string | null): string {
  if (!name) return ""
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserAvatar({ imageUrl, name, size = 56, onPrimary = false }: UserAvatarProps) {
  const colors = useThemeColors()
  const initials = getInitials(name)
  const bg = onPrimary ? colors.primaryForeground : colors.secondary

  const styles = useThemedStyles(() => ({
    circle: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      overflow: "hidden" as const,
    },
    image: { width: size, height: size },
    initials: {
      fontSize: size * 0.36,
      fontWeight: "700" as const,
      color: colors.primary,
    },
  }))

  return (
    <View style={styles.circle}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : initials ? (
        <Text style={styles.initials}>{initials}</Text>
      ) : (
        <Person color={colors.primary} size={size * 0.6} />
      )}
    </View>
  )
}
