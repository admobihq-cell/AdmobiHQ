import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import {
  ANNOUNCEMENT_FORM_FIELDS,
  ANNOUNCEMENT_TARGET_APP_OPTIONS,
  broadcastCreateSchema,
  describeAnnouncementTargets,
  type AnnouncementTargetApp,
} from "@workspace/ops-contracts"

import { CheckboxOff, CheckboxOn, ImageIcon, X } from "@/components/icons"
import { ApiErrorBanner } from "@/components/ui/api-error-banner"
import { BottomSheetPicker } from "@/components/ui/bottom-sheet-picker"
import {
  ANNOUNCEMENT_IMAGE_ASPECT,
  ANNOUNCEMENT_IMAGE_HEIGHT,
  ANNOUNCEMENT_IMAGE_WIDTH,
  isAnnouncementImageCropAvailable,
  prepareAnnouncementImage,
  type AnnouncementImage,
} from "@/lib/announcement-image"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const CATEGORY_FIELD = ANNOUNCEMENT_FORM_FIELDS.find((field) => field.name === "category")!
const CAN_AUTO_CROP = isAnnouncementImageCropAvailable()

// Deliberately not a theme token: this sits on top of an arbitrary photo, not
// an app surface, so it needs a fixed dark scrim for legible contrast against
// any image regardless of light/dark theme — the same reasoning as the
// onboarding carousel's scrim.
const IMAGE_REMOVE_BUTTON_SCRIM = "rgba(0,0,0,0.55)"

export default function NewAnnouncementScreen() {
  const router = useRouter()
  const client = useOpsClient()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  const [category, setCategory] = useState("announcement")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetApps, setTargetApps] = useState<string[]>(["customer-mobile"])
  const [image, setImage] = useState<AnnouncementImage | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
    title: { ...typography.section, color: c.text, marginBottom: spacing.xs },
    field: { gap: spacing.xs },
    label: {
      ...typography.caption,
      fontWeight: "600" as const,
      color: c.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
    input: {
      ...typography.body,
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      minHeight: 48,
    },
    inputError: { borderColor: c.danger },
    multiline: { minHeight: 120, textAlignVertical: "top" as const, paddingTop: 12 },
    fieldError: { ...typography.caption, color: c.danger },
    targetRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    targetLabel: { ...typography.body, color: c.text },
    select: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    selectValue: { ...typography.body, color: c.text, flex: 1 },
    imageTile: {
      width: "100%" as const,
      aspectRatio: ANNOUNCEMENT_IMAGE_ASPECT,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.xs,
      backgroundColor: c.surface,
    },
    imageTileLabel: { ...typography.body, color: c.text, fontWeight: "600" as const },
    imageTileHint: { ...typography.caption, color: c.mutedForeground },
    imagePreviewWrap: { width: "100%" as const, aspectRatio: ANNOUNCEMENT_IMAGE_ASPECT },
    imagePreview: {
      width: "100%" as const,
      height: "100%" as const,
      borderRadius: radius.md,
    },
    imageRemoveButton: {
      position: "absolute" as const,
      top: spacing.xs,
      right: spacing.xs,
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: IMAGE_REMOVE_BUTTON_SCRIM,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    imageProcessingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: `${c.bg}CC`,
      borderRadius: radius.md,
      gap: spacing.xs,
    },
    imageProcessingLabel: { ...typography.caption, color: c.mutedForeground },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.bg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    submit: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: 14,
      alignItems: "center" as const,
    },
    submitPressed: { opacity: 0.85 },
    submitDisabled: { opacity: 0.6 },
    submitText: { ...typography.body, fontWeight: "700" as const, color: c.primaryForeground },
  }))

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError("Photo library access is needed to attach an image.")
      return
    }

    // When the native cropper isn't in this binary yet, fall back to the system
    // editor so OTA updates don't crash waiting for a rebuild.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: CAN_AUTO_CROP ? 1 : 0.85,
      allowsEditing: !CAN_AUTO_CROP,
      aspect: CAN_AUTO_CROP ? undefined : [2, 1],
    })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    setProcessingImage(true)
    setError(null)
    try {
      const final = await prepareAnnouncementImage(asset)
      setImage(final)
    } catch {
      setError("Couldn't process that image. Try a different one.")
    } finally {
      setProcessingImage(false)
    }
  }

  const missingTitle = submitAttempted && !title.trim()
  const missingBody = submitAttempted && !body.trim()

  function handleSubmit() {
    if (saving) return
    const parsed = broadcastCreateSchema.safeParse({
      title,
      body,
      category,
      target_apps: targetApps,
    })
    if (!parsed.success) {
      setSubmitAttempted(true)
      setError(parsed.error.issues[0]?.message ?? "Please check the form and try again.")
      return
    }

    const targets = describeAnnouncementTargets(targetApps)
    Alert.alert(
      `Send to ${targets}?`,
      `This sends a real push notification to every installed ${targets} app. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          style: "destructive",
          onPress: () => void submit(parsed.data),
        },
      ],
    )
  }

  async function submit(data: {
    title: string
    body: string
    category: "announcement" | "campaign" | "billing" | "promo" | "system"
    target_apps: AnnouncementTargetApp[]
  }) {
    setSaving(true)
    setError(null)
    try {
      let imageUrl: string | undefined
      if (image) {
        const uploaded = await client.notifications.uploadImage({
          uri: image.uri,
          name: "announcement.jpg",
          type: "image/jpeg",
        })
        imageUrl = uploaded.url
      }
      await client.notifications.broadcast({ ...data, image_url: imageUrl })
      router.back()
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>New announcement</Text>

        {error ? <ApiErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Send to</Text>
          {ANNOUNCEMENT_TARGET_APP_OPTIONS.map((option) => {
            const checked = targetApps.includes(option.value)
            return (
              <Pressable
                key={option.value}
                style={styles.targetRow}
                onPress={() =>
                  setTargetApps((current) =>
                    checked
                      ? current.filter((value) => value !== option.value)
                      : [...current, option.value],
                  )
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                {checked ? (
                  <CheckboxOn size={18} color={colors.primary} />
                ) : (
                  <CheckboxOff size={18} color={colors.mutedForeground} />
                )}
                <Text style={styles.targetLabel}>{option.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{CATEGORY_FIELD.label}</Text>
          <Pressable
            style={[styles.input, styles.select]}
            onPress={() => setCategoryPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={CATEGORY_FIELD.label}
          >
            <Text style={styles.selectValue} numberOfLines={1}>
              {CATEGORY_FIELD.options?.find((option) => option.value === category)?.label ??
                category}
            </Text>
            <Text style={{ color: colors.mutedForeground }}>▾</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. New payout schedule"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, missingTitle && styles.inputError]}
          />
          {missingTitle ? <Text style={styles.fieldError}>Title is required.</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Message *</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What do customers need to know?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.input, styles.multiline, missingBody && styles.inputError]}
          />
          {missingBody ? <Text style={styles.fieldError}>Message is required.</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Image (optional)</Text>
          {image ? (
            <View style={styles.imagePreviewWrap}>
              <Pressable onPress={pickImage} disabled={processingImage}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
              </Pressable>
              <Pressable
                style={styles.imageRemoveButton}
                onPress={() => setImage(null)}
                disabled={processingImage}
                accessibilityRole="button"
                accessibilityLabel="Remove image"
                hitSlop={8}
              >
                <X color="#fff" size={16} />
              </Pressable>
              {processingImage ? (
                <View style={styles.imageProcessingOverlay}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable
              style={styles.imageTile}
              onPress={pickImage}
              disabled={processingImage}
              accessibilityRole="button"
              accessibilityLabel="Add image"
            >
              {processingImage ? (
                <>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.imageProcessingLabel}>Processing…</Text>
                </>
              ) : (
                <>
                  <ImageIcon color={colors.mutedForeground} size={24} />
                  <Text style={styles.imageTileLabel}>Add image</Text>
                  <Text style={styles.imageTileHint}>
                    {CAN_AUTO_CROP
                      ? `${ANNOUNCEMENT_IMAGE_WIDTH}×${ANNOUNCEMENT_IMAGE_HEIGHT} · auto-cropped & resized`
                      : "Optional · crop in the system editor"}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.submit,
            (pressed || saving) && styles.submitPressed,
            saving && styles.submitDisabled,
          ]}
          disabled={saving || targetApps.length === 0}
          onPress={handleSubmit}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.submitText}>
              Send to {describeAnnouncementTargets(targetApps)}
            </Text>
          )}
        </Pressable>
      </View>

      <BottomSheetPicker
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        title={CATEGORY_FIELD.label}
        options={CATEGORY_FIELD.options ?? []}
        value={category}
        onSelect={(value) => {
          setCategory(value)
          setCategoryPickerOpen(false)
        }}
      />
    </KeyboardAvoidingView>
  )
}
