import { Component, type ReactNode } from "react"
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native"

import { darkColors, lightColors } from "@/lib/theme/palettes"
import { radius, spacing, typography } from "@/lib/theme/tokens"

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const scheme = useColorScheme()
  const colors = scheme === "dark" ? darkColors : lightColors

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>
        {error.message || "An unexpected error occurred."}
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onReset}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
          Try again
        </Text>
      </Pressable>
    </View>
  )
}

type Props = { children: ReactNode }
type State = { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[AppErrorBoundary]", error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onReset={this.reset} />
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.section,
  },
  message: {
    ...typography.body,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  buttonText: {
    ...typography.body,
    fontWeight: "700",
  },
})
