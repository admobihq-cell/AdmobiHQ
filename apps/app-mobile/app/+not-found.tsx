import { Link, Stack } from "expo-router"
import { Pressable, Text, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import {
  ROUTE_SIGNAL_NODES,
  ROUTE_SIGNAL_PATH,
  ROUTE_SIGNAL_STROKE_WIDTH,
  ROUTE_SIGNAL_VIEWBOX,
} from "@/lib/brand/geometry"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export default function NotFoundScreen() {
  const colors = useThemeColors()
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.bg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    markWrap: {
      width: 64,
      height: 64,
      borderRadius: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(155, 69, 37, 0.1)",
      marginBottom: spacing.xs,
    },
    code: {
      ...typography.caption,
      color: c.primary,
      fontWeight: "700" as const,
      letterSpacing: 2,
      textTransform: "uppercase" as const,
    },
    title: {
      ...typography.title,
      color: c.text,
      textAlign: "center" as const,
    },
    description: {
      ...typography.caption,
      fontSize: 14,
      lineHeight: 20,
      color: c.mutedForeground,
      textAlign: "center" as const,
      maxWidth: 280,
    },
    button: {
      marginTop: spacing.sm,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
    },
    pressed: {
      opacity: 0.85,
    },
    buttonText: {
      ...typography.body,
      color: c.primaryForeground,
      fontWeight: "600" as const,
    },
  }))

  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <View style={styles.markWrap}>
          <Svg
            width={36}
            height={26}
            viewBox={`0 0 ${ROUTE_SIGNAL_VIEWBOX.width} ${ROUTE_SIGNAL_VIEWBOX.height}`}
          >
            <Path
              d={ROUTE_SIGNAL_PATH}
              fill="none"
              stroke={colors.primary}
              strokeWidth={ROUTE_SIGNAL_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {ROUTE_SIGNAL_NODES.map((node) => (
              <Circle
                key={`${node.cx}-${node.cy}`}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill={colors.primary}
              />
            ))}
          </Svg>
        </View>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Screen not found</Text>
        <Text style={styles.description}>
          This page isn&apos;t in your Admobi account yet. Return to your overview.
        </Text>
        <Link href="/" asChild>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Back to overview</Text>
          </Pressable>
        </Link>
      </View>
    </>
  )
}
