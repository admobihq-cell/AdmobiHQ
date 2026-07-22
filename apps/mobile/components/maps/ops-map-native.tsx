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
import { useState } from "react"
import { StyleSheet, View, useColorScheme } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { OpsMapHeader } from "@/components/maps/ops-map-header"
import { spacing, useThemedStyles } from "@/lib/theme"

export function OpsMapNative() {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const dark = scheme === "dark"
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
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
  }))

  return (
    <View style={styles.root}>
      <OpsMapHeader
        paddingTop={insets.top + spacing.sm}
        basemap={basemap}
        onBasemapChange={setBasemap}
      />

      <View style={styles.mapWrap}>
        <MapView
          key={`${basemap}-${dark ? "dark" : "light"}`}
          style={StyleSheet.absoluteFillObject}
          mapStyle={mapStyle}
          logoEnabled={false}
          attributionPosition={{ bottom: 8, right: 8 }}
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
      </View>
    </View>
  )
}
