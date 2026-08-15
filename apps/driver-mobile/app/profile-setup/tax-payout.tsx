import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"
import type { DriverPayoutMethod } from "@workspace/ops-contracts"

import { DocumentUploadField } from "@/components/profile-setup/DocumentUploadField"
import { FormInput } from "@/components/profile-setup/FormInput"
import { StepScreen } from "@/components/profile-setup/StepScreen"
import { FilterChips } from "@/components/ui/filter-chips"
import { patchDriverProfile, useDriverProfile } from "@/lib/driver-profile"
import { spacing, useThemedStyles } from "@/lib/theme"

const PAYOUT_METHOD_OPTIONS = [
  { key: "mpesa", label: "M-Pesa" },
  { key: "bank", label: "Bank transfer" },
]

export default function TaxPayoutStep() {
  const router = useRouter()
  const { profile, loading, refetch, getToken } = useDriverProfile()
  const [kraPin, setKraPin] = useState("")
  const [method, setMethod] = useState<DriverPayoutMethod | null>(null)
  const [mpesaMsisdn, setMpesaMsisdn] = useState("")
  const [bankName, setBankName] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const styles = useThemedStyles(() => ({
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    gap: { gap: spacing.lg },
    chips: { marginHorizontal: -spacing.lg },
  }))

  useEffect(() => {
    if (hydrated || !profile) return
    setKraPin(profile.kra_pin ?? "")
    setMethod((profile.payout_method as DriverPayoutMethod | null) ?? null)
    setMpesaMsisdn(profile.payout_mpesa_msisdn ?? "")
    setBankName(profile.payout_bank_name ?? "")
    setBankAccount(profile.payout_bank_account ?? "")
    setHydrated(true)
  }, [hydrated, profile])

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  const certificateDoc = profile.documents.find((d) => d.type === "kra_pin_certificate")
  const canContinue =
    kraPin.trim() &&
    (method === "mpesa"
      ? mpesaMsisdn.trim().length > 0
      : method === "bank"
        ? bankName.trim().length > 0 && bankAccount.trim().length > 0
        : false)

  async function handleNext() {
    if (!method) return
    setError(null)
    setSaving(true)
    try {
      await patchDriverProfile(getToken, {
        kra_pin: kraPin.trim(),
        payout_method: method,
        ...(method === "mpesa"
          ? { payout_mpesa_msisdn: mpesaMsisdn.trim() }
          : { payout_bank_name: bankName.trim(), payout_bank_account: bankAccount.trim() }),
      })
      router.push("/profile-setup/review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <StepScreen
      stepIndex={1}
      title="Tax & payout"
      description="Needed for tax compliance and to know where to send your earnings."
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!canContinue}
      nextLoading={saving}
      error={error}
    >
      <View style={styles.gap}>
        <FormInput
          label="KRA PIN"
          value={kraPin}
          onChangeText={setKraPin}
          autoCapitalize="characters"
          placeholder="A012345678B"
        />
        <DocumentUploadField
          type="kra_pin_certificate"
          label="KRA PIN certificate (optional)"
          hint="A photo of your KRA PIN certificate speeds up review, but isn't required."
          document={certificateDoc}
          onUploaded={() => void refetch()}
        />

        <View style={styles.chips}>
          <FilterChips
            options={PAYOUT_METHOD_OPTIONS}
            selected={method}
            onSelect={(key) => setMethod(key as DriverPayoutMethod | null)}
            showAll={false}
          />
        </View>

        {method === "mpesa" ? (
          <FormInput
            label="M-Pesa number"
            value={mpesaMsisdn}
            onChangeText={setMpesaMsisdn}
            keyboardType="phone-pad"
            placeholder="07XXXXXXXX"
          />
        ) : null}

        {method === "bank" ? (
          <>
            <FormInput label="Bank name" value={bankName} onChangeText={setBankName} />
            <FormInput
              label="Account number"
              value={bankAccount}
              onChangeText={setBankAccount}
              keyboardType="number-pad"
            />
          </>
        ) : null}
      </View>
    </StepScreen>
  )
}
