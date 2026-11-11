import { useEffect, useRef } from "react"
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from "react-native"

import type { ChartPalette } from "../palette"

/** A grey block that pulses, unless the person has asked for reduced motion. */
function Block({ palette, width = "100%", height }: { palette: ChartPalette; width?: DimensionValue; height: number }) {
  const opacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      )
      loop.start()
    })
    return () => {
      cancelled = true
      loop?.stop()
    }
  }, [opacity])
  return <Animated.View style={{ width, height, borderRadius: 6, backgroundColor: palette.grid, opacity }} />
}

const card = (palette: ChartPalette) => ({ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10, backgroundColor: palette.surface, borderColor: palette.border })

/** Placeholder shapes that match the real cards, so nothing jumps when data arrives. */
export function CardSkeleton({ palette, height = 120 }: { palette: ChartPalette; height?: number }) {
  return (
    <View style={card(palette)} accessibilityLabel="Loading">
      <Block palette={palette} width="40%" height={14} />
      <Block palette={palette} height={height} />
    </View>
  )
}

export function KpiStripSkeleton({ palette, count = 4 }: { palette: ChartPalette; count?: number }) {
  return (
    <View style={[styles.kpis, { borderColor: palette.border, backgroundColor: palette.surface }]} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.kpi}>
          <Block palette={palette} width="60%" height={12} />
          <Block palette={palette} width="80%" height={22} />
        </View>
      ))}
    </View>
  )
}

export function ChartSkeleton({ palette, height = 180 }: { palette: ChartPalette; height?: number }) {
  return <CardSkeleton palette={palette} height={height} />
}

export function ListSkeleton({ palette, rows = 5 }: { palette: ChartPalette; rows?: number }) {
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Block key={i} palette={palette} height={44} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  kpis: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  kpi: { width: "50%", padding: 12, gap: 8 },
})
