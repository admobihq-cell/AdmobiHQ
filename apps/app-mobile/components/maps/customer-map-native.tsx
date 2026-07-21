import {
  COVERAGE_ZONES,
  NAIROBI_CENTER,
  NAIROBI_DEFAULT_ZOOM,
  getCustomerBookedCorridors,
  getCustomerPlayPoints,
  type Corridor,
} from "@workspace/geo"
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
} from "@maplibre/maplibre-react-native"
import { useMemo, useState } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { colors, spacing, typography } from "@/lib/theme"

type LayerKey = "corridors" | "coverage" | "plays"

const LAYER_LABELS: Record<LayerKey, string> = {
  corridors: "Corridors",
  coverage: "Coverage",
  plays: "Plays",
}

const LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"

function corridorsToGeoJSON(corridors: Corridor[]) {
  return {
    type: "FeatureCollection" as const,
    features: corridors.map((corridor) => ({
      type: "Feature" as const,
      id: corridor.id,
      properties: {
        id: corridor.id,
        name: corridor.name,
        color: corridor.color,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: corridor.coordinates,
      },
    })),
  }
}

export function CustomerMapNative() {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const corridors = useMemo(() => getCustomerBookedCorridors(), [])
  const corridorGeo = useMemo(() => corridorsToGeoJSON(corridors), [corridors])
  const plays = useMemo(() => getCustomerPlayPoints(), [])
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    corridors: true,
    coverage: true,
    plays: true,
  })

  function toggle(key: LayerKey) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Map</Text>
        <Text style={styles.subtitle}>
          Booked corridors, coverage, and proof-of-play (demo data).
        </Text>
        <View style={styles.toggles}>
          {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => {
            const on = layers[key]
            return (
              <Pressable
                key={key}
                onPress={() => toggle(key)}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {LAYER_LABELS[key]}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          mapStyle={scheme === "dark" ? DARK_STYLE : LIGHT_STYLE}
          logoEnabled={false}
          attributionPosition={{ bottom: 8, right: 8 }}
        >
          <Camera
            defaultSettings={{
              centerCoordinate: NAIROBI_CENTER,
              zoomLevel: NAIROBI_DEFAULT_ZOOM,
            }}
          />

          {layers.coverage ? (
            <ShapeSource id="customer-coverage" shape={COVERAGE_ZONES}>
              <FillLayer
                id="customer-coverage-fill"
                style={{
                  fillColor: [
                    "match",
                    ["get", "kind"],
                    "cbd",
                    "#0F766E",
                    "estate",
                    "#C2410C",
                    "arterial",
                    "#1D4ED8",
                    "#64748B",
                  ],
                  fillOpacity: 0.22,
                }}
              />
              <LineLayer
                id="customer-coverage-line"
                style={{
                  lineColor: "#0F766E",
                  lineWidth: 1.5,
                  lineOpacity: 0.55,
                }}
              />
            </ShapeSource>
          ) : null}

          {layers.corridors ? (
            <ShapeSource id="customer-corridors" shape={corridorGeo}>
              <LineLayer
                id="customer-corridors-line"
                style={{
                  lineColor: ["get", "color"],
                  lineWidth: 4,
                  lineOpacity: 0.9,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </ShapeSource>
          ) : null}

          {layers.plays ? (
            <ShapeSource
              id="customer-plays"
              shape={plays}
              cluster
              clusterRadius={50}
              clusterMaxZoomLevel={14}
            >
              <CircleLayer
                id="customer-plays-clusters"
                filter={["has", "point_count"]}
                style={{
                  circleColor: [
                    "step",
                    ["get", "point_count"],
                    "#0F766E",
                    5,
                    "#C2410C",
                    15,
                    "#9A3412",
                  ],
                  circleRadius: [
                    "step",
                    ["get", "point_count"],
                    16,
                    5,
                    20,
                    15,
                    26,
                  ],
                  circleOpacity: 0.85,
                }}
              />
              <CircleLayer
                id="customer-plays-points"
                filter={["!", ["has", "point_count"]]}
                style={{
                  circleColor: "#0F766E",
                  circleRadius: 6,
                  circleStrokeWidth: 2,
                  circleStrokeColor: "#FFFFFF",
                }}
              />
            </ShapeSource>
          ) : null}
        </MapView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
  toggles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipOff: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.label,
    color: colors.mutedForeground,
  },
  chipTextOn: {
    color: colors.primaryForeground,
  },
  mapWrap: {
    flex: 1,
    overflow: "hidden",
  },
})
