import { useCallback, useState } from "react"
import type { LayoutChangeEvent } from "react-native"

/** The measured width of a view, for SVG charts that draw to their container. 0 until first layout. */
export function useWidth() {
  const [width, setWidth] = useState(0)
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width)), [])
  return { width, onLayout }
}
