import * as ImagePicker from "expo-image-picker"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-expo"
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native"
import type { DriverDocumentDto, DriverDocumentType } from "@workspace/ops-contracts"

import { CloudUpload } from "@/components/icons"
import { driverDocumentFileUrl, uploadDriverDocument } from "@/lib/driver-profile"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

async function fetchAsDataUri(getToken: () => Promise<string | null>, url: string) {
  const token = await getToken()
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
  if (!res.ok) throw new Error("Failed to load preview")
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function DocumentUploadField({
  type,
  label,
  hint,
  document,
  onUploaded,
}: {
  type: DriverDocumentType
  label: string
  hint?: string
  document: DriverDocumentDto | undefined
  onUploaded: (doc: DriverDocumentDto) => void
}) {
  const { getToken } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewQuery = useQuery({
    queryKey: ["driver-document-preview", document?.id],
    queryFn: () => fetchAsDataUri(getToken, driverDocumentFileUrl(document!.id)),
    enabled: Boolean(document),
  })
  const previewUri = previewQuery.data ?? null

  const styles = useThemedStyles((c) => ({
    label: { ...typography.label, color: c.text },
    hint: { ...typography.caption, color: c.mutedText, marginTop: 2 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.sm,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: c.mutedSurface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    thumbImage: { width: 56, height: 56, borderRadius: radius.md },
    actions: { flexDirection: "row" as const, gap: spacing.sm },
    actionButton: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    actionLabel: { ...typography.bodySm, fontWeight: "600" as const, color: c.text },
    error: { ...typography.caption, color: c.danger, marginTop: 4 },
  }))

  async function upload(asset: ImagePicker.ImagePickerAsset) {
    setError(null)
    setUploading(true)
    try {
      const doc = await uploadDriverDocument(getToken, type, {
        uri: asset.uri,
        name: asset.fileName ?? "photo.jpg",
        type: asset.mimeType ?? "image/jpeg",
      })
      onUploaded(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      setError("Camera access is needed to take a photo")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled && result.assets[0]) void upload(result.assets[0])
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError("Photo library access is needed to choose a file")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) void upload(result.assets[0])
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <View style={styles.row}>
        <View style={styles.thumb}>
          {uploading ? (
            <ActivityIndicator />
          ) : previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.thumbImage} />
          ) : (
            <CloudUpload size={22} />
          )}
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={pickFromCamera} disabled={uploading}>
            <Text style={styles.actionLabel}>Take photo</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={pickFromLibrary} disabled={uploading}>
            <Text style={styles.actionLabel}>Choose file</Text>
          </Pressable>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}
