import Constants from "expo-constants"
import * as SplashScreen from "expo-splash-screen"
import * as Updates from "expo-updates"
import { useEffect, useRef, useState } from "react"
import { Alert } from "react-native"

const isExpoGo = Constants.executionEnvironment === "storeClient"

if (!isExpoGo) {
  SplashScreen.setOptions({
    duration: 500,
    fade: true,
  })
}

const MIN_SPLASH_MS = 900

export function useSplashBootstrap(isReady: boolean) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isReady || !minTimeElapsed) return
    void SplashScreen.hideAsync()
  }, [isReady, minTimeElapsed])
}

/**
 * `readyToPrompt` gates the restart Alert (not the download) behind the caller's
 * own "app is interactive" signal, so it can't pop up over the splash screen or
 * mid-onboarding.
 */
export function useOtaUpdates(readyToPrompt: boolean) {
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const prompted = useRef(false)

  useEffect(() => {
    if (__DEV__) return

    void (async () => {
      try {
        const update = await Updates.checkForUpdateAsync()
        if (!update.isAvailable) return

        await Updates.fetchUpdateAsync()
        // Downloaded now, applied on next cold start by default — but also
        // surfaced below so the user can opt into restarting sooner. Immediate,
        // unprompted reloadAsync() after splash often looks like a crash when
        // the OTA bundle is bad, so this always waits for explicit consent.
        setUpdateDownloaded(true)
      } catch {
        // OTA is best-effort; offline or misconfigured EAS Update should not block launch.
      }
    })()
  }, [])

  useEffect(() => {
    if (!updateDownloaded || !readyToPrompt || prompted.current) return
    prompted.current = true

    Alert.alert(
      "Update ready",
      "A new version has been downloaded. Restart now to apply it?",
      [
        { text: "Later", style: "cancel" },
        { text: "Restart now", onPress: () => void Updates.reloadAsync() },
      ],
    )
  }, [updateDownloaded, readyToPrompt])
}

export type ManualUpdateCheckResult =
  | { status: "unsupported" }
  | { status: "up-to-date" }
  | { status: "downloaded" }
  | { status: "error"; message: string }

export async function checkForUpdateManually(): Promise<ManualUpdateCheckResult> {
  if (__DEV__ || isExpoGo) return { status: "unsupported" }

  try {
    const update = await Updates.checkForUpdateAsync()
    if (!update.isAvailable) return { status: "up-to-date" }

    await Updates.fetchUpdateAsync()
    return { status: "downloaded" }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { isExpoGo }
