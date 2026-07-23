import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"

import { DEFAULT_BASEMAP, type BasemapId } from "@workspace/geo"
import { OpsMapHeader } from "@/components/maps/ops-map-header"
import { buildOpsMapHtml } from "@/components/maps/ops-map-html"
import { spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

export function OpsMapWeb() {
  const insets = useSafeAreaInsets()
  const scheme = useColorScheme()
  const colors = useThemeColors()
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP)
  const [loadError, setLoadError] = useState(false)
  const styles = useThemedStyles((c) => ({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    mapWrap: {
      flex: 1,
      minHeight: 280,
      overflow: "hidden" as const,
      backgroundColor: c.muted,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.sm,
      backgroundColor: c.muted,
    },
    errorText: {
      ...typography.bodySm,
      color: c.mutedForeground,
      textAlign: "center" as const,
      paddingHorizontal: spacing.lg,
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

  useEffect(() => {
    setLoadError(false)
  }, [basemap, scheme])

  return (
    <View style={styles.root}>
      <OpsMapHeader
        paddingTop={insets.top + spacing.sm}
        basemap={basemap}
        onBasemapChange={setBasemap}
      />
      <View style={styles.mapWrap}>
        {loadError ? (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>
              Couldn&apos;t load the map. Check your connection and try again.
            </Text>
          </View>
        ) : (
          <WebView
            key={`${basemap}-${scheme}`}
            originWhitelist={["*"]}
            source={{
              html,
              baseUrl: "https://basemaps.cartocdn.com/",
            }}
            style={StyleSheet.absoluteFillObject}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            androidLayerType={Platform.OS === "android" ? "hardware" : undefined}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.overlay}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
            onError={() => setLoadError(true)}
            onHttpError={() => setLoadError(true)}
          />
        )}
      </View>
    </View>
  )
}
