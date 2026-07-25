import { useState } from "react"
import { Alert } from "react-native"
import { useRouter } from "expo-router"
import { ANNOUNCEMENT_FORM_FIELDS, broadcastCreateSchema } from "@workspace/ops-contracts"

import { EntityFormScreen } from "@/components/EntityFormScreen"
import { formatOpsError } from "@/lib/format-error"
import { API_URL, useOpsClient } from "@/lib/ops-client"

export default function NewAnnouncementScreen() {
  const router = useRouter()
  const client = useOpsClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: Record<string, string>) => {
    const parsed = broadcastCreateSchema.safeParse({
      title: values.title,
      body: values.body,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form and try again.")
      return
    }

    Alert.alert(
      "Send to all customers?",
      "This sends a real push notification to every installed customer app. This can't be undone.",
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

  const submit = async (data: { title: string; body: string }) => {
    setSaving(true)
    setError(null)
    try {
      await client.notifications.broadcast(data)
      router.back()
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    } finally {
      setSaving(false)
    }
  }

  return (
    <EntityFormScreen
      title="New announcement"
      fields={ANNOUNCEMENT_FORM_FIELDS}
      submitLabel="Send to all customers"
      saving={saving}
      error={error}
      onDismissError={() => setError(null)}
      onSubmit={handleSubmit}
    />
  )
}
