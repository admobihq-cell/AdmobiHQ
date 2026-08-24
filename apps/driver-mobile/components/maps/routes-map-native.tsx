import {
  DEFAULT_BASEMAP,
  NAIROBI_CENTER,
  NAIROBI_DEFAULT_ZOOM,
  resolveBasemapStyleUrl,
  type BasemapId,
} from "@workspace/geo"
import {
  Camera,
  FillExtrusionLayer,
  MapView,
} from "@maplibre/maplibre-react-native"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  InteractionManager,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native"

import { RoutesMapHeader } from "@/components/maps/routes-map-header"
import { spacing, useThemeColors, useThemedStyles } from "@/lib/theme"

export function RoutesMapNative() {
  const scheme = useColorScheme()
  const dark = scheme === "dark"
  const colors = useThemeColors()
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const [mapReady, setMapReady] = useState(false)
  const mapStyle = resolveBasemapStyleUrl(basemap, dark)
  const pitch = basemap === "streets3d" ? 52 : 0
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    mapWrap: {
      flex: 1,
      minHeight: 280,
      overflow: "hidden" as const,
    },
    placeholder: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.surface,
    },
  }))

  // Defer the native MapLibre mount until interactions (screen transition,
  // gestures) have settled — same pattern as app/_layout.tsx's appReady gate.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setMapReady(true)
    })
    return () => task.cancel()
  }, [])

  return (
    <View style={styles.root}>
      <RoutesMapHeader
        paddingTop={spacing.sm}
        basemap={basemap}
        onBasemapChange={setBasemap}
      />

      <View style={styles.mapWrap}>
        {mapReady ? (
          <MapView
            key={`${basemap}-${dark ? "dark" : "light"}`}
            style={StyleSheet.absoluteFillObject}
            mapStyle={mapStyle}
            logoEnabled={false}
            attributionPosition={{ bottom: 8, right: 8 }}
            compassEnabled
          >
            <Camera
              defaultSettings={{
                centerCoordinate: NAIROBI_CENTER,
                zoomLevel: NAIROBI_DEFAULT_ZOOM,
                pitch,
              }}
            />

            {basemap === "streets3d" ? (
              <FillExtrusionLayer
                id="buildings-3d"
                sourceID="openmaptiles"
                sourceLayerID="building"
                style={{
                  fillExtrusionColor: dark ? "#4a4654" : "#c8c2b8",
                  fillExtrusionHeight: [
                    "coalesce",
                    ["get", "render_height"],
                    ["get", "height"],
                    12,
                  ],
                  fillExtrusionBase: [
                    "coalesce",
                    ["get", "render_min_height"],
                    ["get", "min_height"],
                    0,
                  ],
                  fillExtrusionOpacity: 0.7,
                }}
              />
            ) : null}
          </MapView>
        ) : (
          <View style={styles.placeholder}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </View>
    </View>
  )
}
