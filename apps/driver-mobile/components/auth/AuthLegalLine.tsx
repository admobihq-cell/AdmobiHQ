import { Linking, Text } from "react-native"

import { PRIVACY_URL, TERMS_URL } from "@/lib/legal-urls"
import { typography } from "@/lib/theme/tokens"
import { useThemedStyles } from "@/lib/theme"

export function AuthLegalLine() {
  const styles = useThemedStyles((c) => ({
    text: { ...typography.caption, color: c.mutedForeground, textAlign: "center" },
    link: { color: c.text, fontWeight: "600" as const },
  }))

  return (
    <Text style={styles.text}>
      By continuing, you agree to Admobi&apos;s{" "}
      <Text style={styles.link} onPress={() => void Linking.openURL(TERMS_URL)}>
        Terms of Service
      </Text>{" "}
      and{" "}
      <Text style={styles.link} onPress={() => void Linking.openURL(PRIVACY_URL)}>
        Privacy Policy
      </Text>
      .
    </Text>
  )
}
