import { useEffect, useMemo, useState } from "react"
import {
  useWindowDimensions,
  View,
  useColorScheme,
  type LayoutChangeEvent,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { DEFAULT_BASEMAP, type BasemapId } from "@workspace/geo"
import { OpsMapHeader } from "@/components/maps/ops-map-header"
import { buildOpsMapHtml } from "@/components/maps/ops-map-html"
import { spacing, useThemedStyles } from "@/lib/theme"

export function OpsMap() {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const { height: windowHeight } = useWindowDimensions()
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const [headerHeight, setHeaderHeight] = useState(100)

  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      height: "100%" as unknown as number,
      minHeight: windowHeight,
      backgroundColor: c.bg,
    },
    mapWrap: {
      width: "100%" as unknown as number,
      overflow: "hidden" as const,
      backgroundColor: c.muted,
    },
  }))

  const html = useMemo(
    () =>
      buildOpsMapHtml({
        dark: scheme === "dark",
        basemap,
      }),
    [scheme, basemap],
  )

  const iframeSrc = useMemo(() => {
    if (typeof URL === "undefined" || typeof Blob === "undefined") return null
    const blob = new Blob([html], { type: "text/html" })
    return URL.createObjectURL(blob)
  }, [html])

  useEffect(() => {
    return () => {
      if (iframeSrc) URL.revokeObjectURL(iframeSrc)
    }
  }, [iframeSrc])

  const mapHeight = Math.max(
    320,
    windowHeight - headerHeight - insets.bottom - 8,
  )

  function onHeaderLayout(event: LayoutChangeEvent) {
    const next = Math.ceil(event.nativeEvent.layout.height)
    if (next > 0 && Math.abs(next - headerHeight) > 1) {
      setHeaderHeight(next)
    }
  }

  return (
    <View style={styles.root}>
      <View onLayout={onHeaderLayout}>
        <OpsMapHeader
          paddingTop={insets.top + spacing.sm}
          basemap={basemap}
          onBasemapChange={setBasemap}
        />
      </View>
      <View style={[styles.mapWrap, { height: mapHeight }]}>
        <iframe
          key={`${basemap}-${scheme}`}
          title="Admobi ops network map"
          src={iframeSrc ?? undefined}
          srcDoc={iframeSrc ? undefined : html}
          style={{
            width: "100%",
            height: mapHeight,
            border: "none",
            display: "block",
          }}
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </View>
    </View>
  )
}
