import { Image, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"
import { textShadow } from "@/lib/text-shadow"

const BANNER_IMAGE = require("@/assets/images/aerial-city-routes.jpg")
const SCRIM = "20,16,13"
const BANNER_HEIGHT = 148

type DashboardBannerProps = {
  eyebrow: string
  title: string
  description?: string
}

/** Greeting banner — same city photography + scrim grammar as onboarding. */
export function DashboardBanner({ eyebrow, title, description }: DashboardBannerProps) {
  const styles = useThemedStyles((c) => ({
    root: {
      height: BANNER_HEIGHT,
      borderRadius: radius.xl,
      overflow: "hidden" as const,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: "#14100D",
    },
    content: {
      flex: 1,
      justifyContent: "flex-end" as const,
      padding: spacing.lg,
      gap: 2,
    },
    eyebrow: {
      ...typography.eyebrow,
      color: "#FFFFFF",
      opacity: 0.92,
      ...textShadow("rgba(0,0,0,0.55)", 1, 6),
    },
    title: {
      ...typography.display,
      fontSize: 23,
      lineHeight: 27,
      color: "#FFFFFF",
      ...textShadow("rgba(0,0,0,0.5)", 1, 8),
    },
    description: {
      ...typography.bodySm,
      color: "rgba(255,255,255,0.88)",
      marginTop: spacing.xs,
      ...textShadow("rgba(0,0,0,0.45)", 1, 6),
    },
  }))

  return (
    <View style={styles.root}>
      <Image
        source={BANNER_IMAGE}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        accessible={false}
      />

      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="dashboardBannerScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={`rgb(${SCRIM})`} stopOpacity={0.1} />
            <Stop offset="0.45" stopColor={`rgb(${SCRIM})`} stopOpacity={0.28} />
            <Stop offset="1" stopColor={`rgb(${SCRIM})`} stopOpacity={0.86} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#dashboardBannerScrim)" />
      </Svg>

      <View style={styles.content}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
