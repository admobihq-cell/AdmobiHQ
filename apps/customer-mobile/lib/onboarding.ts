import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useState } from "react"

const ONBOARDING_STORAGE_KEY = "onboarding_completed"

export function useOnboarding() {
  const [checked, setChecked] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    let cancelled = false
    void AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((stored) => {
      if (cancelled) return
      setCompleted(stored === "true")
      setChecked(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const complete = useCallback(() => {
    setCompleted(true)
    void AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true")
  }, [])

  return { checked, completed, complete }
}
