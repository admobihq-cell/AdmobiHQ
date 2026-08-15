import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"

import { DocumentUploadField } from "@/components/profile-setup/DocumentUploadField"
import { FormInput } from "@/components/profile-setup/FormInput"
import { StepScreen } from "@/components/profile-setup/StepScreen"
import { patchDriverProfile, useDriverProfile } from "@/lib/driver-profile"
import { spacing, useThemedStyles } from "@/lib/theme"

export default function ProfileStep() {
  const router = useRouter()
  const { profile, loading, refetch, getToken } = useDriverProfile()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const styles = useThemedStyles(() => ({
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    gap: { gap: spacing.lg },
  }))

  useEffect(() => {
    if (hydrated || !profile) return
    setFullName(profile.full_name ?? "")
    setPhone(profile.phone ?? "")
    setCity(profile.city ?? "")
    setNationalId(profile.national_id_number ?? "")
    setHydrated(true)
  }, [hydrated, profile])

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  const nationalIdDoc = profile.documents.find((d) => d.type === "national_id")
  const photoDoc = profile.documents.find((d) => d.type === "profile_photo")
  const canContinue =
    fullName.trim() && phone.trim() && city.trim() && nationalId.trim() && nationalIdDoc && photoDoc

  async function handleNext() {
    setError(null)
    setSaving(true)
    try {
      await patchDriverProfile(getToken, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        national_id_number: nationalId.trim(),
      })
      router.push("/profile-setup/tax-payout")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <StepScreen
      stepIndex={0}
      title="Your profile"
      description="Tell us who you are and verify your identity."
      onNext={handleNext}
      nextDisabled={!canContinue}
      nextLoading={saving}
      error={error}
    >
      <View style={styles.gap}>
        <FormInput label="Full name" value={fullName} onChangeText={setFullName} />
        <FormInput label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FormInput label="City" value={city} onChangeText={setCity} />
        <FormInput
          label="National ID number"
          value={nationalId}
          onChangeText={setNationalId}
          keyboardType="number-pad"
        />
        <DocumentUploadField
          type="national_id"
          label="National ID (front)"
          hint="A clear photo of your National ID card."
          document={nationalIdDoc}
          onUploaded={() => void refetch()}
        />
        <DocumentUploadField
          type="profile_photo"
          label="Profile photo"
          hint="Face clearly visible, no sunglasses or hats."
          document={photoDoc}
          onUploaded={() => void refetch()}
        />
      </View>
    </StepScreen>
  )
}
