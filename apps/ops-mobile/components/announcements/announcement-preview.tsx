import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Image } from "expo-image"
import {
  PREVIEW_AUDIENCES,
  hasTemplateTokens,
  previewAudiences,
  previewFor,
  type PreviewAudience,
} from "@workspace/ops-contracts"

import { radius, spacing, useThemeColors } from "@/lib/theme"

/**
 * The announcement as a recipient's phone shows it, with sample values in place of personal fields.
 * Used by the composer and the detail view. A Customer / Driver switch appears when the send reaches both.
 */
export function AnnouncementPreview({
  title,
  body,
  imageUri,
  targetApps,
  timestamp = "now",
}: {
  title: string
  body: string
  imageUri?: string | null
  targetApps: string[]
  timestamp?: string
}) {
  const colors = useThemeColors()
  const audiences = previewAudiences(targetApps)
  const [picked, setPicked] = useState<PreviewAudience>("customer")
  const audience = audiences.includes(picked) ? picked : audiences[0]!
  const renderedTitle = previewFor(audience, title)
  const renderedBody = previewFor(audience, body)

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <Text style={[styles.heading, { color: colors.text }]}>Preview</Text>
        {audiences.length > 1 ? (
          <View style={[styles.switch, { backgroundColor: colors.muted }]} accessibilityRole="radiogroup" accessibilityLabel="Preview as">
            {audiences.map((option) => (
              <Pressable
                key={option}
                onPress={() => setPicked(option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: audience === option }}
                style={[styles.option, audience === option && { backgroundColor: colors.surface }]}
              >
                <Text style={{ color: audience === option ? colors.text : colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>
                  {PREVIEW_AUDIENCES[option].label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "600" }}>{PREVIEW_AUDIENCES[audience].appName}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{timestamp}</Text>
        </View>
        <Text style={{ color: renderedTitle ? colors.text : colors.mutedForeground, fontSize: 14, fontWeight: "600" }}>
          {renderedTitle || "Title"}
        </Text>
        <Text numberOfLines={4} style={{ color: renderedBody ? colors.text : colors.mutedForeground, fontSize: 14, lineHeight: 19 }}>
          {renderedBody || "Your message"}
        </Text>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" /> : null}
      </View>

      {hasTemplateTokens(title, body) ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>
          {audience === "customer"
            ? "Sample values shown: first name “Jordan”, organisation “Acme Ads”."
            : "Sample values shown: first name “Jordan”. Drivers have no organisation, so that field is left out."}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 32 },
  heading: { fontSize: 14, fontWeight: "600" },
  switch: { flexDirection: "row", borderRadius: radius.sm, padding: 2 },
  option: { paddingHorizontal: 12, minHeight: 32, justifyContent: "center", borderRadius: radius.sm },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md, gap: 4, overflow: "hidden" },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  image: { width: "100%", aspectRatio: 2, borderRadius: radius.md, marginTop: spacing.sm },
})
