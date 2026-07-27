import { Platform } from "react-native"
import type { TextStyle } from "react-native"

// react-native-web wants the unified CSS `textShadow` string and warns on the
// legacy split props; native (iOS/Android) only understands the split props
// and doesn't recognize the shorthand at all. Branch per platform so both
// render the shadow without either side warning.
export function textShadow(color: string, offsetY: number, radius: number): TextStyle {
  if (Platform.OS === "web") {
    return { textShadow: `0px ${offsetY}px ${radius}px ${color}` } as TextStyle
  }
  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: offsetY },
    textShadowRadius: radius,
  }
}
