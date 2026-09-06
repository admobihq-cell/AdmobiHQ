import { useEffect, useState } from "react"
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import {
  CREATIVE_FORMATS_LABEL,
  MAX_CREATIVE_BYTES,
  MAX_CREATIVES_PER_CAMPAIGN,
  checkCreativeForFormat,
  specsForFormat,
  type CampaignCreativeDto,
  type CampaignFormat,
} from "@workspace/ops-contracts"

import { Add, PlayCircle, Trash } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { creativeFileUrl, type PickedCreative } from "@/lib/campaigns-client"
import { formatCampaignError, useDeleteCreative, useUploadCreative } from "@/lib/use-campaigns"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const MAX_MB = Math.floor(MAX_CREATIVE_BYTES / 1024 / 1024)

/** expo-image-picker reports the asset's own mime type on most paths, but not
 * all — fall back to the extension so the server gets something it can match
 * against the allow-list rather than a rejected empty string. */
function mimeTypeFor(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.mimeType) return asset.mimeType
  const extension = asset.uri.split(".").pop()?.toLowerCase()
  if (extension === "png") return "image/png"
  if (extension === "gif") return "image/gif"
  if (extension === "mp4") return "video/mp4"
  if (asset.type === "video") return "video/mp4"
  return "image/jpeg"
}

function fileNameFor(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.fileName) return asset.fileName
  return asset.uri.split("/").pop() ?? "creative"
}

function captionFor(creative: CampaignCreativeDto): string {
  if (creative.width && creative.height) return `${creative.width} x ${creative.height}`
  return creative.original_filename ?? "Creative"
}

function CreativeThumb({
  campaignId,
  creative,
  onDelete,
  disabled,
}: {
  campaignId: number
  creative: CampaignCreativeDto
  onDelete: () => void
  disabled: boolean
}) {
  const colors = useThemeColors()
  const getToken = useTokenGetter()
  const [token, setToken] = useState<string | null>(null)
  const isVideo = creative.resource_type === "video"

  useEffect(() => {
    void getToken().then(setToken)
  }, [getToken])

  const styles = useThemedStyles((c) => ({
    tile: {
      width: "47%" as const,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: "hidden" as const,
    },
    media: { height: 96, width: "100%" as const, backgroundColor: c.muted },
    videoStand: {
      height: 96,
      width: "100%" as const,
      backgroundColor: c.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    footer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    },
    caption: { ...typography.caption, color: c.mutedForeground, flex: 1 },
    remove: { padding: 4 },
    removePressed: { opacity: 0.6 },
  }))

  return (
    <View style={styles.tile}>
      {isVideo ? (
        <View style={styles.videoStand}>
          <PlayCircle color={colors.mutedForeground} size={26} />
        </View>
      ) : (
        <Image
          // RN's Image takes request headers, so the authenticated proxy route
          // works directly — no Cloudinary URL ever reaches this component.
          source={{
            uri: creativeFileUrl(campaignId, creative.id),
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }}
          style={styles.media}
          resizeMode="cover"
        />
      )}
      <View style={styles.footer}>
        <Text style={styles.caption} numberOfLines={1}>
          {captionFor(creative)}
        </Text>
        <Pressable
          onPress={onDelete}
          disabled={disabled}
          style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
          accessibilityRole="button"
          accessibilityLabel="Remove creative"
          hitSlop={8}
        >
          <Trash color={colors.mutedForeground} size={15} />
        </Pressable>
      </View>
    </View>
  )
}

export function CreativePicker({
  campaignId,
  format,
  creatives,
  disabled = false,
}: {
  campaignId: number
  format: CampaignFormat
  creatives: CampaignCreativeDto[]
  disabled?: boolean
}) {
  const colors = useThemeColors()
  const upload = useUploadCreative(campaignId)
  const remove = useDeleteCreative(campaignId)
  const [error, setError] = useState<string | null>(null)

  const specs = specsForFormat(format)
  const atLimit = creatives.length >= MAX_CREATIVES_PER_CAMPAIGN
  const busy = disabled || upload.isPending

  const styles = useThemedStyles((c) => ({
    wrap: { gap: spacing.md },
    specCard: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    specTitle: { ...typography.label, color: c.text, fontWeight: "700" as const },
    specLine: { ...typography.caption, color: c.mutedForeground },
    specStrong: { color: c.text, fontWeight: "600" as const },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    pickButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.sm,
      paddingVertical: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.primary,
      backgroundColor: `${c.primary}0D`,
    },
    pickButtonDisabled: { opacity: 0.6 },
    pickText: { ...typography.label, color: c.primary, fontWeight: "700" as const },
  }))

  async function pick() {
    setError(null)

    // SDK 54 keeps videoExportPreset at "Passthrough", which means iOS asks
    // for media-library permission the moment a video is selected. Asking
    // first turns a surprise post-selection dialog into an expected one.
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError("Allow photo access to attach creative.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      // quality 1 + no editing is what keeps an animated GIF animated on
      // Android; anything else hands back the first frame as a PNG.
      quality: 1,
      allowsEditing: false,
    })
    if (result.canceled) return

    for (const asset of result.assets) {
      if (asset.fileSize && asset.fileSize > MAX_CREATIVE_BYTES) {
        setError(`${fileNameFor(asset)} is over ${MAX_MB}MB.`)
        continue
      }

      // The picker already knows the dimensions, so a wrong-shaped file can
      // be refused before spending the user's mobile data on the upload. The
      // server check after upload is still the real gate.
      if (asset.width && asset.height) {
        const check = checkCreativeForFormat(format, asset.width, asset.height)
        if (!check.ok) {
          setError(check.message ?? "This file doesn't match the panel shape.")
          continue
        }
      }

      const file: PickedCreative = {
        uri: asset.uri,
        name: fileNameFor(asset),
        mimeType: mimeTypeFor(asset),
      }
      const saved = await upload.mutateAsync(file).catch(() => null)
      // A warning means the file saved but may look soft on the panel — say
      // so without implying it failed.
      if (saved?.warning) setError(saved.warning)
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.specCard}>
        <Text style={styles.specTitle}>Creative specs</Text>
        {specs.map((spec) => (
          <Text key={spec.format} style={styles.specLine}>
            <Text style={styles.specStrong}>{spec.label}</Text> — {spec.widthMm} x{" "}
            {spec.heightMm} mm{spec.pitch ? `, ${spec.pitch}` : ""}, {spec.aspectLabel},{" "}
            {spec.sidesLabel.toLowerCase()}
          </Text>
        ))}
        <Text style={styles.specLine}>
          {CREATIVE_FORMATS_LABEL} · up to {MAX_MB}MB · max {MAX_CREATIVES_PER_CAMPAIGN} files
        </Text>
        {specs.length > 1 ? (
          <Text style={[styles.specLine, styles.specStrong]}>
            This campaign runs on both panels, so it needs artwork for each shape.
          </Text>
        ) : null}
      </View>

      {creatives.length > 0 ? (
        <View style={styles.grid}>
          {creatives.map((creative) => (
            <CreativeThumb
              key={creative.id}
              campaignId={campaignId}
              creative={creative}
              disabled={busy || remove.isPending}
              onDelete={() => remove.mutate(creative.id)}
            />
          ))}
        </View>
      ) : null}

          {atLimit || disabled ? null : (
        <Pressable
          style={({ pressed }) => [
            styles.pickButton,
            (busy || pressed) && styles.pickButtonDisabled,
          ]}
          onPress={() => void pick()}
          disabled={busy}
          accessibilityRole="button"
        >
          {upload.isPending ? (
            <>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.pickText}>Uploading…</Text>
            </>
          ) : (
            <>
              <Add color={colors.primary} size={18} />
              <Text style={styles.pickText}>
                {creatives.length > 0 ? "Add another creative" : "Add creative"}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {error ? <ApiErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {upload.error ? <ApiErrorBanner message={formatCampaignError(upload.error)} /> : null}
      {remove.error ? <ApiErrorBanner message={formatCampaignError(remove.error)} /> : null}
    </View>
  )
}
