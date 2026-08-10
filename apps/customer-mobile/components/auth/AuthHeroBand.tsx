import { Image, Platform, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType, type TextStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { lightColors } from "@/lib/theme/palettes"
import { spacing, typography } from "@/lib/theme/tokens"

const SCRIM = "20,16,13"
// Brand's committed brick/terracotta primary — the light-theme value reads
// as a decisive accent against warm photography regardless of app theme
// (mirrors the same choice in components/onboarding/onboarding-screen.tsx).
const ACCENT = lightColors.primary

function textShadow(color: string, offsetY: number, radius: number): TextStyle {
  if (Platform.OS === "web") {
    return { textShadow: `0px ${offsetY}px ${radius}px ${color}` } as TextStyle
  }
  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: offsetY },
    textShadowRadius: radius,
  }
}

type AuthHeroBandProps = {
  image: ImageSourcePropType
  eyebrow: string
  title: string
}

/** Compact top photo band for auth screens — brand photography + scrim + headline. */
export function AuthHeroBand({ image, eyebrow, title }: AuthHeroBandProps) {
  const { width, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const height = Math.min(300, windowHeight * 0.32) + insets.top

  return (
    <View style={[styles.container, { height }]}>
      <Image source={image} resizeMode="cover" style={StyleSheet.absoluteFillObject} accessible={false} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="auth-hero-scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={`rgb(${SCRIM})`} stopOpacity={0.35} />
            <Stop offset="0.5" stopColor={`rgb(${SCRIM})`} stopOpacity={0.25} />
            <Stop offset="1" stopColor={`rgb(${SCRIM})`} stopOpacity={0.85} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#auth-hero-scrim)" />
      </Svg>
      <View style={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "flex-end",
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: ACCENT,
    marginBottom: spacing.xs,
    ...textShadow("rgba(0,0,0,0.55)", 1, 6),
  },
  title: {
    ...typography.title,
    color: "#FFFFFF",
    ...textShadow("rgba(0,0,0,0.45)", 1, 10),
  },
})
