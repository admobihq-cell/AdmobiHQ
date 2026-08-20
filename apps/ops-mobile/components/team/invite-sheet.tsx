import { useEffect, useState } from "react"
import { Modal, Pressable, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { OpsRoleDto, TeamRoleUpdateInput } from "@workspace/ops-contracts"

import { BottomSheetPicker, type BottomSheetPickerOption } from "@/components/ui/bottom-sheet-picker"
import { Field, Label, PrimaryButton, SecondaryButton } from "@/components/ui"
import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

const ADMIN_VALUE = "admin"
const memberValue = (roleId: number) => `member:${roleId}`

function decodeTier(value: string): TeamRoleUpdateInput | null {
  if (value === ADMIN_VALUE) return { tier: "admin" }
  const roleId = Number(value.slice("member:".length))
  return Number.isFinite(roleId) ? { tier: "member", roleId } : null
}

type InviteSheetProps = {
  visible: boolean
  onClose: () => void
  roles: OpsRoleDto[]
  initialEmail?: string
  submitting: boolean
  onSubmit: (input: { email: string } & TeamRoleUpdateInput) => void
}

export function InviteSheet({
  visible,
  onClose,
  roles,
  initialEmail = "",
  submitting,
  onSubmit,
}: InviteSheetProps) {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState(initialEmail)
  const [tierValue, setTierValue] = useState(
    roles[0] ? memberValue(roles[0].id) : ADMIN_VALUE,
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail)
      setTierValue(roles[0] ? memberValue(roles[0].id) : ADMIN_VALUE)
    }
  }, [visible, initialEmail, roles])

  const options: BottomSheetPickerOption[] = [
    { value: ADMIN_VALUE, label: "Admin" },
    ...roles.map((role) => ({ value: memberValue(role.id), label: role.name })),
  ]
  const selectedLabel = options.find((option) => option.value === tierValue)?.label ?? "Choose a role"

  const styles = useThemedStyles((c) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end" as const,
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: insets.bottom + spacing.lg,
    },
    title: {
      ...typography.headline,
      color: c.text,
      marginBottom: spacing.md,
    },
    picker: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: c.background,
      borderColor: c.input,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      marginBottom: spacing.md,
    },
    pickerText: {
      ...typography.body,
      color: c.text,
    },
  }))

  function handleSubmit() {
    const decoded = decodeTier(tierValue)
    if (!email.trim() || !decoded) return
    onSubmit({ email: email.trim(), ...decoded })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
          <Text style={styles.title}>Invite someone</Text>

          <Label>Email</Label>
          <Field
            value={email}
            onChangeText={setEmail}
            placeholder="name@admobihq.com"
            keyboardType="email-address"
            autoCorrect={false}
            editable={!submitting}
          />

          <Label>Role</Label>
          <Pressable style={styles.picker} onPress={() => setPickerOpen(true)} disabled={submitting}>
            <Text style={styles.pickerText}>{selectedLabel}</Text>
          </Pressable>

          <PrimaryButton
            label={submitting ? "Inviting…" : "Invite"}
            onPress={handleSubmit}
            disabled={submitting || !email.trim()}
          />
          <SecondaryButton label="Cancel" onPress={onClose} disabled={submitting} />
        </Pressable>
      </Pressable>

      <BottomSheetPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose a role"
        options={options}
        value={tierValue}
        onSelect={(value) => {
          setTierValue(value)
          setPickerOpen(false)
        }}
      />
    </Modal>
  )
}
