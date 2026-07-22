import { useEffect, useRef } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { radius, spacing, typography, useThemedStyles } from "@/lib/theme"

const DEFAULT_LENGTH = 6

type OtpCodeInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  onComplete?: (value: string) => void
}

export function OtpCodeInput({
  value,
  onChange,
  length = DEFAULT_LENGTH,
  disabled = false,
  autoFocus = true,
  onComplete,
}: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null)
  const digits = Array.from({ length }, (_, index) => value[index] ?? "")
  const activeIndex = Math.min(value.length, length - 1)
  const styles = useThemedStyles((c) => ({
    wrap: {
      position: "relative" as const,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: spacing.sm,
    },
    box: {
      flex: 1,
      aspectRatio: 0.85,
      maxWidth: 52,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    boxFilled: {
      borderColor: c.primary,
      backgroundColor: c.accent,
    },
    boxActive: {
      borderColor: c.ring,
    },
    boxDisabled: {
      opacity: 0.55,
    },
    digit: {
      ...typography.title,
      fontSize: 22,
      color: c.text,
    },
    hiddenInput: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.02,
      color: "transparent",
    },
  }))

  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [autoFocus, disabled])

  function handleChange(raw: string) {
    const next = raw.replace(/\D/g, "").slice(0, length)
    onChange(next)
    if (next.length === length) {
      onComplete?.(next)
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={disabled}
        onPress={() => inputRef.current?.focus()}
        style={styles.row}
      >
        {digits.map((digit, index) => {
          const filled = digit.length > 0
          const active = !disabled && index === activeIndex
          return (
            <View
              key={index}
              style={[
                styles.box,
                filled && styles.boxFilled,
                active && styles.boxActive,
                disabled && styles.boxDisabled,
              ]}
            >
              <Text style={styles.digit}>{digit || " "}</Text>
            </View>
          )
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        editable={!disabled}
        caretHidden
        style={styles.hiddenInput}
        importantForAutofill="yes"
      />
    </View>
  )
}
