import { useCallback, useRef, useState } from "react"
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { ChevronRight } from "@/components/icons"
import { lightColors } from "@/lib/theme/palettes"
import { radius, spacing, typography } from "@/lib/theme/tokens"

type Slide = {
  key: string
  eyebrow: string
  title: string
  body: string
  image: ImageSourcePropType
}

const TAXI_STREET_IMAGE = require("@/assets/images/taxi-street-night.jpg")
const HAND_PHONE_MAP_IMAGE = require("@/assets/images/hand-phone-map.jpg")
const AERIAL_ROUTES_IMAGE = require("@/assets/images/aerial-city-routes.jpg")

const SLIDES: Slide[] = [
  {
    key: "reach",
    eyebrow: "Out-of-home, reimagined",
    title: "Advertising that moves with the city",
    body: "Put your brand on Nairobi's taxi fleet — seen wherever the road goes.",
    image: TAXI_STREET_IMAGE,
  },
  {
    key: "target",
    eyebrow: "Precision targeting",
    title: "Target the routes that matter",
    body: "Choose neighborhoods, set your schedule, and reach the exact audience your campaign needs.",
    image: HAND_PHONE_MAP_IMAGE,
  },
  {
    key: "track",
    eyebrow: "Live performance",
    title: "Watch your campaign in real time",
    body: "Track impressions, delivery rate, and spend as it happens.",
    image: AERIAL_ROUTES_IMAGE,
  },
]

// Brand's committed brick/terracotta primary — deliberately the darker, more
// saturated light-theme value (not the dark-theme variant) because it needs
// to read as a decisive control against warm, bright photography, not a
// deep app surface. darkColors.primary is close to the sunset highlights it
// sits on and disappears into them.
const ACCENT = lightColors.primary
const ACCENT_FOREGROUND = lightColors.primaryForeground
const SCRIM = "20,16,13"
const CHROME_RESERVE = 172

// react-native-web wants the unified CSS `textShadow` string and warns on the
// legacy split props; native (iOS/Android) only understands the split props
// and doesn't recognize the shorthand at all. Branch per platform so both
// render the shadow without either side warning.
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

type OnboardingScreenProps = {
  onDone: () => void
}

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const listRef = useRef<Animated.FlatList<Slide>>(null)
  const [index, setIndex] = useState(0)
  const scrollX = useSharedValue(0)
  const isLast = index === SLIDES.length - 1

  const goToIndex = useCallback(
    (next: number) => {
      listRef.current?.scrollToOffset({ offset: next * width, animated: true })
      setIndex(next)
    },
    [width],
  )

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.value = event.nativeEvent.contentOffset.x
    },
    [scrollX],
  )

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
    },
    [width],
  )

  const handleNext = useCallback(() => {
    if (isLast) {
      onDone()
      return
    }
    goToIndex(index + 1)
  }, [goToIndex, index, isLast, onDone])

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={StyleSheet.absoluteFillObject}
        renderItem={({ item, index: itemIndex }) => (
          <SlideItem
            item={item}
            itemIndex={itemIndex}
            width={width}
            height={height}
            scrollX={scrollX}
            bottomReserve={insets.bottom + CHROME_RESERVE}
          />
        )}
      />

      <View
        style={[
          styles.topOverlay,
          { paddingTop: insets.top + spacing.sm, pointerEvents: "box-none" },
        ]}
      >
        {isLast ? (
          <View style={styles.skipSpacer} />
        ) : (
          <Pressable onPress={onDone} hitSlop={12} style={styles.skipButton}>
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View
        style={[
          styles.bottomOverlay,
          { paddingBottom: insets.bottom + spacing.lg, pointerEvents: "box-none" },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          {isLast ? (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}
            >
              <Text style={styles.ctaLabel}>Get started</Text>
            </Pressable>
          ) : (
            <View style={styles.nextRow}>
              <Pressable
                onPress={handleNext}
                style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
              >
                <ChevronRight color={ACCENT_FOREGROUND} size={22} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

type SlideItemProps = {
  item: Slide
  itemIndex: number
  width: number
  height: number
  scrollX: SharedValue<number>
  bottomReserve: number
}

function SlideItem({ item, itemIndex, width, height, scrollX, bottomReserve }: SlideItemProps) {
  const textStyle = useAnimatedStyle(() => {
    const inputRange = [(itemIndex - 1) * width, itemIndex * width, (itemIndex + 1) * width]
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollX.value, inputRange, [22, 0, -22], Extrapolation.CLAMP) },
      ],
    }
  })

  return (
    <View style={[styles.page, { width, height }]}>
      <Image source={item.image} resizeMode="cover" style={styles.backgroundImage} accessible={false} />

      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={`rgb(${SCRIM})`} stopOpacity={0.4} />
            <Stop offset="0.16" stopColor={`rgb(${SCRIM})`} stopOpacity={0.05} />
            <Stop offset="0.4" stopColor={`rgb(${SCRIM})`} stopOpacity={0.4} />
            <Stop offset="0.62" stopColor={`rgb(${SCRIM})`} stopOpacity={0.75} />
            <Stop offset="1" stopColor={`rgb(${SCRIM})`} stopOpacity={0.97} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#scrim)" />
      </Svg>

      <View style={[styles.slide, { paddingBottom: bottomReserve }]}>
        <Animated.View
          style={textStyle}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`Slide ${itemIndex + 1} of ${SLIDES.length}. ${item.eyebrow}. ${item.title}. ${item.body}`}
        >
          <Text style={styles.eyebrow}>{item.eyebrow}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#14100D",
  },
  page: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  skipButton: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipSpacer: {
    height: 40,
  },
  skipLabel: {
    ...typography.label,
    color: "rgba(255,255,255,0.85)",
    ...textShadow("rgba(0,0,0,0.4)", 1, 6),
  },
  slide: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: ACCENT,
    marginBottom: spacing.xs,
    ...textShadow("rgba(0,0,0,0.55)", 1, 6),
  },
  title: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.6,
    color: "#FFFFFF",
    marginBottom: spacing.sm,
    ...textShadow("rgba(0,0,0,0.45)", 1, 10),
  },
  body: {
    ...typography.body,
    color: "rgba(255,255,255,0.85)",
    ...textShadow("rgba(0,0,0,0.4)", 1, 8),
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 6,
    borderRadius: radius.full,
  },
  dotActive: {
    width: 20,
    backgroundColor: ACCENT,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  footer: {
    paddingHorizontal: spacing.xl,
  },
  ctaButton: {
    backgroundColor: ACCENT,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  ctaLabel: {
    ...typography.headline,
    color: ACCENT_FOREGROUND,
  },
  nextRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
})
