import { useEffect, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Image } from "expo-image"
import { useAuth } from "@clerk/clerk-expo"
import type { SafetyIncidentPhotoDto } from "@workspace/ops-contracts"

import { X } from "@/components/icons"
import { useOpsClient } from "@/lib/ops-client"
import { radius, spacing, useThemeColors } from "@/lib/theme"

/**
 * The photos a driver attached to an SOS. The file route is private (it streams bytes behind the ops
 * login), so every image is fetched with the same bearer token the API calls use. Tap one to see it full size.
 */
export function IncidentPhotos({ incidentId, photos }: { incidentId: number; photos: SafetyIncidentPhotoDto[] }) {
  const colors = useThemeColors()
  const client = useOpsClient()
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    void getToken().then(setToken)
  }, [getToken])

  if (photos.length === 0) return null
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined

  return (
    <View style={{ gap: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {photos.map((photo, i) => {
          const uri = client.safety.photoFileUrl(incidentId, photo.id)
          return (
            <Pressable
              key={photo.id}
              onPress={() => setOpen(uri)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1} of ${photos.length}, full size`}
            >
              <Image
                source={{ uri, headers }}
                style={[styles.thumb, { backgroundColor: colors.muted, borderColor: colors.border }]}
                contentFit="cover"
                transition={150}
                accessibilityLabel={`Photo ${i + 1}`}
              />
            </Pressable>
          )
        })}
      </ScrollView>
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(null)}>
          {open ? <Image source={{ uri: open, headers }} style={styles.full} contentFit="contain" transition={150} /> : null}
          <Pressable style={styles.close} onPress={() => setOpen(null)} hitSlop={12} accessibilityLabel="Close photo">
            <X color="#fff" size={28} />
          </Pressable>
          <Text style={styles.hint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  thumb: { width: 112, height: 112, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  full: { width: "94%", height: "70%" },
  close: { position: "absolute", top: 56, right: 20 },
  hint: { position: "absolute", bottom: 40, color: "rgba(255,255,255,0.7)", fontSize: 12 },
})
