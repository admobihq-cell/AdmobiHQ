import { useState } from "react"
import { useAuth } from "@clerk/clerk-expo"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  formatLabel,
  SAFETY_INCIDENT_TYPES,
  type SafetyIncidentType,
} from "@workspace/ops-contracts"

import {
  Breakdown,
  Camera,
  CarCrash,
  Damage,
  Harassment,
  HelpCircle,
  Images,
  Medical,
  Theft,
  Trash,
  type AppIcon,
} from "@/components/icons"
import { MAX_PENDING_PHOTOS, pendingPhotoFromAsset } from "@/lib/sos-photos"
import { captureLocation, createIncident, type PendingPhoto } from "@/lib/sos"
import { radius, spacing, typography, useThemeColors, useThemedStyles } from "@/lib/theme"

const TYPE_ICONS: Record<SafetyIncidentType, AppIcon> = {
  accident: CarCrash,
  harassment: Harassment,
  theft: Theft,
  vehicle_damage: Damage,
  medical: Medical,
  breakdown: Breakdown,
  other: HelpCircle,
}

const TYPE_LABELS: Record<SafetyIncidentType, string> = {
  accident: "Accident",
  harassment: "Harassment",
  theft: "Theft",
  vehicle_damage: "Damage",
  medical: "Medical",
  breakdown: "Breakdown",
  other: "Something else",
}

export default function SosSubmitScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { getToken } = useAuth()

  const [type, setType] = useState<SafetyIncidentType | null>(null)
  const [description, setDescription] = useState("")
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [submitting, setSubmitting] = useState(false)

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, gap: spacing.lg },
    emergencyCard: {
      backgroundColor: c.destructiveMuted,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.destructive,
      padding: spacing.md,
      gap: spacing.sm,
    },
    emergencyButton: {
      backgroundColor: c.destructive,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center" as const,
    },
    emergencyButtonText: { ...typography.headline, color: "#FFFFFF" },
    disclaimer: { ...typography.caption, color: c.mutedForeground },
    sectionTitle: { ...typography.section, color: c.foreground },
    hint: { ...typography.caption, color: c.mutedForeground, marginTop: -spacing.xs },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: spacing.sm,
    },
    tile: {
      width: "31%" as const,
      aspectRatio: 1,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: spacing.xs,
      padding: spacing.xs,
    },
    tileSelected: { borderColor: c.destructive, backgroundColor: c.destructiveMuted },
    tileLabel: { ...typography.caption, color: c.foreground, textAlign: "center" as const },
    input: {
      ...typography.body,
      color: c.foreground,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 96,
      textAlignVertical: "top" as const,
    },
    photoRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm },
    thumb: { width: 72, height: 72, borderRadius: radius.md },
    thumbWrap: { position: "relative" as const },
    removeBadge: {
      position: "absolute" as const,
      top: -6,
      right: -6,
      backgroundColor: c.destructive,
      borderRadius: radius.full,
      padding: 4,
    },
    addPhoto: {
      width: 72,
      height: 72,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: "dashed" as const,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 2,
    },
    submit: {
      backgroundColor: c.destructive,
      borderRadius: radius.lg,
      paddingVertical: spacing.md + 2,
      alignItems: "center" as const,
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { ...typography.headline, color: "#FFFFFF" },
  }))

  const addPhotos = async (from: "camera" | "library") => {
    const remaining = MAX_PENDING_PHOTOS - photos.length
    if (remaining <= 0) return

    const result =
      from === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            mediaTypes: ["images"],
          })

    if (result.canceled) return
    setPhotos((current) =>
      [...current, ...result.assets.map(pendingPhotoFromAsset)].slice(0, MAX_PENDING_PHOTOS),
    )
  }

  const submit = async () => {
    if (!type || submitting) return
    setSubmitting(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not signed in")

      // Location is captured here, not on screen entry, so the permission
      // prompt only appears once the driver has committed to sending.
      const location = await captureLocation()

      const incident = await createIncident(token, {
        type,
        description: description.trim() || undefined,
        ...location,
      })

      // Photos upload from the tracking screen, not here: ops is alerted the
      // moment this returns, and a failed upload must never lose the report.
      router.replace({
        pathname: "/sos/[id]",
        params: { id: String(incident.id), pending: JSON.stringify(photos) },
      })
    } catch (error) {
      console.error("[sos] submit failed", error)
      Alert.alert(
        "Could not send",
        "We couldn't file your report. Check your connection and try again — or call 999 if this is an emergency.",
      )
      setSubmitting(false)
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Emergency services first, above our own form: a driver in a real
          accident should not be reading a form to get help. */}
      <View style={styles.emergencyCard}>
        <Pressable
          accessibilityRole="button"
          style={styles.emergencyButton}
          onPress={() => Linking.openURL("tel:999")}
        >
          <Text style={styles.emergencyButtonText}>Call 999 — police, ambulance, fire</Text>
        </Pressable>
        <Text style={styles.disclaimer}>
          Admobi is not an emergency service. If someone is hurt or in danger, call 999 first,
          then tell us below.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionTitle}>What happened?</Text>
        <View style={styles.grid}>
          {SAFETY_INCIDENT_TYPES.map((value) => {
            const Icon = TYPE_ICONS[value]
            const selected = type === value
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={TYPE_LABELS[value] ?? formatLabel(value)}
                onPress={() => setType(value)}
                style={[styles.tile, selected && styles.tileSelected]}
              >
                <Icon color={selected ? colors.destructive : colors.mutedForeground} size={26} />
                <Text style={styles.tileLabel}>{TYPE_LABELS[value] ?? formatLabel(value)}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionTitle}>Anything else? (optional)</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Where you are, what you need, whether anyone is hurt"
          placeholderTextColor={colors.mutedForeground}
          maxLength={2000}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionTitle}>Photos (optional)</Text>
        <Text style={styles.hint}>
          Up to {MAX_PENDING_PHOTOS}. These upload after your report is sent, so help is on the
          way first.
        </Text>
        <View style={styles.photoRow}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.thumbWrap}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                style={styles.removeBadge}
                onPress={() => setPhotos((c) => c.filter((_, i) => i !== index))}
              >
                <Trash color="#FFFFFF" size={12} />
              </Pressable>
            </View>
          ))}

          {photos.length < MAX_PENDING_PHOTOS ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take a photo"
                style={styles.addPhoto}
                onPress={() => void addPhotos("camera")}
              >
                <Camera color={colors.mutedForeground} size={22} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose photos"
                style={styles.addPhoto}
                onPress={() => void addPhotos("library")}
              >
                <Images color={colors.mutedForeground} size={22} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !type || submitting }}
        disabled={!type || submitting}
        onPress={() => void submit()}
        style={[styles.submit, (!type || submitting) && styles.submitDisabled]}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Send SOS</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}
